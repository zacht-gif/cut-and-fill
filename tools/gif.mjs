/**
 * gif.mjs — render an animated GIF of real play, straight out of the game.
 *
 *   node tools/gif.mjs              # the default clip, into assets/screenshots/
 *   node tools/gif.mjs rush-hour    # just the clips whose id matches
 *
 * Why this exists: the store page has four stills, and stills cannot show the
 * one thing the game is actually about. Traffic advances one step per move,
 * and the red cells say where it lands next — that is a relationship between
 * consecutive frames, so a single frame literally cannot carry it.
 *
 * Like shots.mjs, this drives an unmodified index.html over the DevTools
 * protocol and plays real moves through the game's own doMove, so a clip is a
 * position actually reached rather than a mock-up. It shares the browser
 * plumbing with shots.mjs (tools/lib/chrome.mjs) so there is one copy of it.
 *
 * The moves come from SOLUTIONS inside index.html — the same array the test
 * suites replay — so a clip cannot drift from a solution the repo proves.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { launch, sleep } from "./lib/chrome.mjs";
import { decodePNG } from "./lib/png.mjs";
import { encodeGIF } from "./lib/gif.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GAME = pathToFileURL(path.join(ROOT, "index.html")).href;
const OUT = path.join(ROOT, "assets", "screenshots");

/* Strip the chrome down to wordmark plus board, the same treatment the cover
   uses: at GIF sizes a full HUD turns to mush, and every pixel spent on UI is
   a pixel not spent on the mechanic. Only presentation is touched — the
   position and the moves are the real ones. */
const BARE = `
  document.querySelector("#drawer").classList.add("closed");
  for (const sel of [".adslot", ".stats", "#objectives", ".row", "#pad",
                     "#gen", "#drawerToggle", "header .sub", "#banner"]) {
    document.querySelectorAll(sel).forEach(el => el.style.display = "none");
  }
`;

/* Winning schedules showOverlay("win") on a 260ms timer (index.html:2133),
   which drops a dark scrim over the whole page — and BARE has already hidden
   the card's own `.row` (index.html:498; `.row` is generic and appears inside
   the overlays too), so the clip ended on a near-black rectangle with nothing
   on it.

   Clearing the `on` class before each capture does NOT fix it: the class is
   added by a timer that fires *after* the clear, and a CDP round trip plus two
   rAFs is comfortably longer than 260ms, so the scrim wins the race. Stubbing
   the function is the fix that does not depend on timing at all.

   A looping clip wants to end on the finished board regardless — the payoff is
   the last hole filling, not a modal with buttons. Presentation only: the win
   itself still happens, and the run is verified through the game's own `won`. */
const NO_OVERLAY = `showOverlay = () => {};`;

const CLIPS = [
  {
    id: "rush-hour",
    file: "rush-hour.gif",
    width: 560,
    height: 460,
    // Level 19 "Rush Hour": four vehicles, four gates, par 22. The densest
    // traffic in the campaign, which is the point — this is the clip that has
    // to sell timing, and the level's own name does half the work.
    level: 18,
    frameDelay: 420,
    holdFirst: 900,
    holdLast: 2200,
  },
];

/** Wait for the board to settle, then hold the looping animations still.
 *  Same reasoning as shots.mjs: the ripples and warning pulses run on infinite
 *  loops, so without pinning, each frame samples them at whatever phase the
 *  clock happened to be in and the GIF flickers with noise that has nothing to
 *  do with the move that was just played.
 *
 *  (The win overlay is dealt with at setup time instead — see NO_OVERLAY.) */
const SETTLE = `(async () => {
  for (const a of document.getAnimations()) {
    // pause() before assigning, not after - see tools/shots.mjs for why.
    if (a.effect?.getTiming?.().iterations === Infinity) { a.pause(); a.currentTime = 0; }
  }
  document.querySelector("#board").style.setProperty("--move-ms", "0ms");
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
})()`;

async function evaluate(cdp, sessionId, expression, awaitPromise = true) {
  const res = await cdp.send("Runtime.evaluate",
    { expression, awaitPromise, returnByValue: true }, sessionId);
  if (res.exceptionDetails) {
    throw new Error(res.exceptionDetails.text + " " +
      (res.exceptionDetails.exception?.description ?? ""));
  }
  return res.result?.value;
}

async function capture(cdp, sessionId) {
  await evaluate(cdp, sessionId, SETTLE);
  await sleep(60);
  const { data } = await cdp.send("Page.captureScreenshot",
    { format: "png", captureBeyondViewport: false }, sessionId);
  return decodePNG(Buffer.from(data, "base64"));
}

async function main() {
  const filter = process.argv[2];
  const clips = filter ? CLIPS.filter((c) => c.id.includes(filter)) : CLIPS;
  if (!clips.length) {
    console.error(`No clip id matches "${filter}". Known: ${CLIPS.map((c) => c.id).join(", ")}`);
    process.exit(1);
  }

  // Read the reference solutions out of index.html rather than restating them.
  // validate.py --emit generates that array and both test suites replay it; a
  // second copy here would be one more thing to drift.
  const html = await readFile(path.join(ROOT, "index.html"), "utf8");
  const m = html.match(/const SOLUTIONS=\[([\s\S]*?)\];/);
  if (!m) throw new Error("could not find the SOLUTIONS array in index.html");
  const SOLUTIONS = Array.from(m[1].matchAll(/"([^"]*)"/g), (x) => x[1]);

  await mkdir(OUT, { recursive: true });
  const { cdp, sessionId, dispose } = await launch();

  try {
    for (const clip of clips) {
      const moves = SOLUTIONS[clip.level];
      if (!moves) throw new Error(`no solution recorded for level index ${clip.level}`);

      await cdp.send("Emulation.setDeviceMetricsOverride",
        { width: clip.width, height: clip.height, deviceScaleFactor: 1, mobile: false }, sessionId);

      const loaded = cdp.once("Page.loadEventFired");
      await cdp.send("Page.navigate", { url: GAME }, sessionId);
      await loaded;
      await sleep(250);

      await evaluate(cdp, sessionId,
        `(async () => { closeTitle(); ${NO_OVERLAY} ${BARE} loadLevel(${clip.level}); render(); })()`);
      await sleep(320);

      const frames = [];
      frames.push({ img: await capture(cdp, sessionId), delay: clip.holdFirst });

      const DIR = { U: 0, R: 1, D: 2, L: 3, ".": -1 };
      for (const ch of moves) {
        const dir = DIR[ch];
        if (dir === undefined) throw new Error("unknown move character: " + ch);
        await evaluate(cdp, sessionId, `doMove(${dir})`, false);
        await sleep(120);
        frames.push({ img: await capture(cdp, sessionId), delay: clip.frameDelay });
      }
      frames[frames.length - 1].delay = clip.holdLast;

      // A clip of a losing run would be worse than no clip. The game exposes
      // its own win state; trust that rather than the frame count.
      const won = await evaluate(cdp, sessionId, "won === true");
      if (!won) throw new Error(`${clip.id}: the run did not end in a win — the clip would show a failure`);

      const { width, height } = frames[0].img;
      const gif = encodeGIF(
        frames.map((f) => ({ data: f.img.data, delay: f.delay })),
        width, height
      );
      await writeFile(path.join(OUT, clip.file), gif);
      console.log(
        `${clip.file.padEnd(18)} ${width}x${height}  ${frames.length} frames  ` +
        `${(gif.length / 1024).toFixed(0)} KB`
      );
    }
  } finally {
    await dispose();
  }

  console.log(`\nWrote to ${path.relative(ROOT, OUT)}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

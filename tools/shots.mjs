/**
 * shots.mjs — render marketing imagery straight out of the real game.
 *
 * Drives an unmodified index.html in headless Chrome over the DevTools
 * protocol and writes PNGs at exact pixel sizes. index.html is never copied
 * or patched: the script reaches in through the globals the game already
 * exposes (closeTitle, loadLevel, doMove, render), so a screenshot can never
 * drift from what a player actually sees.
 *
 * Node 24 ships a global WebSocket, so this needs no dependencies and makes
 * no network requests.
 *
 *   node tools/shots.mjs            # everything, into assets/screenshots/
 *   node tools/shots.mjs cover      # just the shots whose id matches
 */

import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { CDP, launch, sleep } from "./lib/chrome.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GAME = pathToFileURL(path.join(ROOT, "index.html")).href;
const OUT = path.join(ROOT, "assets", "screenshots");

/* ---------------- the shot list ----------------
   `setup` runs in the page after load. It may return a promise; `wait` is an
   extra settle in ms for CSS transitions that have no completion event. */

const D = { UP: 0, RIGHT: 1, DOWN: 2, LEFT: 3 };

/** fitCell() sizes the board from whatever vertical room is left over after
 *  every visible sibling (index.html:1824). The levels drawer is open by
 *  default and eats most of it, so anything that wants a legible board has to
 *  close the drawer *before* loadLevel triggers the fit. */
const CLOSE_DRAWER = `document.querySelector("#drawer").classList.add("closed");`;

/** Cover art, not a screenshot. itch renders the cover at roughly half size in
 *  browse listings, where a full HUD turns to mush — so strip the chrome down
 *  to wordmark plus board and let fitCell spend the reclaimed height on cells
 *  (it caps at 56px, index.html:1827). Only presentation is touched: the
 *  position on the board is the real one, played out by the same moves. */
const BARE = CLOSE_DRAWER + `
  for (const sel of [".adslot", ".stats", "#objectives", ".row", "#pad",
                     "#gen", "#drawerToggle", "header .sub", "#banner"]) {
    document.querySelectorAll(sel).forEach(el => el.style.display = "none");
  }
  const wordmark = document.querySelector("header h1");
  wordmark.style.fontSize = "44px";
  wordmark.style.letterSpacing = ".18em";
  document.querySelector("header").style.justifyContent = "center";
`;

/** Drive a sequence of moves with enough of a gap that the board animates the
 *  way it does under a human hand rather than snapping (index.html:2029). */
const play = ({ level, path, pre = CLOSE_DRAWER }) => `
  closeTitle();
  ${pre}
  loadLevel(${level});
  await new Promise(r => setTimeout(r, 140));
  for (const d of ${JSON.stringify(path)}) {
    doMove(d);
    await new Promise(r => setTimeout(r, 90));
  }
  fitCell(); render();
`;

const SHOTS = [
  {
    id: "01-level-select",
    file: "01-level-select.png",
    // Taller than 16:9 on purpose: the drawer *is* the subject, and this is
    // the shortest frame that fits masthead through legend without scrolling.
    width: 1280,
    height: 860,
    setup: `
      closeTitle();
      loadLevel(0);
      document.querySelector("#drawer").classList.remove("closed");
    `,
    wait: 400,
  },
  {
    id: "02-gameplay",
    file: "02-gameplay.png",
    width: 1280,
    height: 720,
    // Level 15 "Haul Road" — the guide's pick for showing traffic.
    setup: play({ level: 14, path: [D.RIGHT, D.RIGHT, D.DOWN] }),
    wait: 400,
  },
  {
    id: "03-settings",
    file: "03-settings.png",
    width: 1280,
    height: 720,
    // Vibration and touch-mode hide themselves off a touch device
    // (index.html:2452, 2471), so a desktop capture would show two settings
    // the game supports but the screenshot silently denies.
    touch: true,
    setup: `
      closeTitle();
      ${CLOSE_DRAWER}
      loadLevel(14);
      await new Promise(r => setTimeout(r, 140));
      document.querySelector("#settings").classList.add("on");
    `,
    wait: 400,
  },
  {
    id: "04-difficulty",
    file: "04-difficulty.png",
    width: 1280,
    height: 720,
    // Level 25 "Graveyard Shift" — the finale, densest board in the campaign.
    setup: play({ level: 24, path: [D.DOWN, D.RIGHT, D.RIGHT] }),
    wait: 400,
  },
  {
    id: "cover",
    file: "cover.png",
    width: 630,
    height: 500,
    // itch's cover slot. The layout already collapses to a phone screen, so
    // rendering the real thing at 630x500 beats compositing a fake.
    setup: play({ level: 14, path: [D.RIGHT, D.RIGHT, D.DOWN], pre: BARE }),
    wait: 500,
  },
];

/* ---------------- a very small CDP client ---------------- */

async function main() {
  const filter = process.argv[2];
  const shots = filter ? SHOTS.filter((s) => s.id.includes(filter)) : SHOTS;
  if (!shots.length) {
    console.error(`No shot id matches "${filter}". Known: ${SHOTS.map((s) => s.id).join(", ")}`);
    process.exit(1);
  }

  await mkdir(OUT, { recursive: true });

  const { cdp, sessionId, dispose } = await launch();
  try {

    const problems = [];
    for (const shot of shots) {
      await cdp.send(
        "Emulation.setDeviceMetricsOverride",
        { width: shot.width, height: shot.height, deviceScaleFactor: 1, mobile: false },
        sessionId
      );
      // Set before navigate: the game reads navigator.maxTouchPoints once, at
      // paint time, and never re-checks.
      await cdp.send(
        "Emulation.setTouchEmulationEnabled",
        { enabled: !!shot.touch, maxTouchPoints: shot.touch ? 5 : 1 },
        sessionId
      );

      // Reload from scratch every time so no shot inherits the last one's state.
      const loaded = cdp.once("Page.loadEventFired");
      await cdp.send("Page.navigate", { url: GAME }, sessionId);
      await loaded;
      await sleep(250);

      const res = await cdp.send(
        "Runtime.evaluate",
        {
          expression: `(async () => { ${shot.setup} })()`,
          awaitPromise: true,
          returnByValue: true,
        },
        sessionId
      );
      if (res.exceptionDetails) {
        problems.push(`${shot.id}: ${res.exceptionDetails.text} ${res.exceptionDetails.exception?.description ?? ""}`);
        continue;
      }

      await sleep(shot.wait ?? 300);

      // Soft ground ripples and warning cells pulse, both on infinite loops
      // (index.html:116, 149), so an unpinned capture samples them at whatever
      // phase the clock happened to be in and no two runs match. Rewind just
      // the looping ones to t=0 and hold them there. Finite animations — the
      // overlay `pop`, the `tamp` on a filled hole — are left alone: they have
      // already finished by now, and freezing them at t=0 would capture a
      // settings card scaled to nothing.
      await cdp.send(
        "Runtime.evaluate",
        {
          expression: `(async () => {
          for (const a of document.getAnimations()) {
            if (a.effect?.getTiming?.().iterations === Infinity) {
              a.currentTime = 0;
              a.pause();
            }
          }
          // doMove derives --move-ms from the real gap between moves
          // (index.html:2032), so timer jitter leaves it a millisecond
          // different every run. Everything has settled by now; zero it so the
          // capture has no timing-derived state left in it at all.
          document.querySelector("#board").style.setProperty("--move-ms", "0ms");
          // Pausing is not the same as the compositor having drawn the paused
          // frame. Hand back two rAFs so the held phase is what actually gets
          // rasterised, or the capture races the tick and the ripple lands a
          // frame further on than it was pinned to.
          await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
          })()`,
          awaitPromise: true,
        },
        sessionId
      );
      await sleep(80);

      const { data } = await cdp.send(
        "Page.captureScreenshot",
        { format: "png", captureBeyondViewport: false },
        sessionId
      );
      const buf = Buffer.from(data, "base64");
      await writeFile(path.join(OUT, shot.file), buf);
      console.log(`${shot.file.padEnd(22)} ${shot.width}x${shot.height}  ${(buf.length / 1024).toFixed(0)} KB`);
    }

    if (problems.length) {
      console.error("\nShots that failed to set up:");
      for (const p of problems) console.error("  " + p);
      process.exitCode = 1;
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

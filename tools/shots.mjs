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

import { spawn } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GAME = pathToFileURL(path.join(ROOT, "index.html")).href;
const OUT = path.join(ROOT, "assets", "screenshots");

const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find(existsSync);

if (!CHROME) {
  console.error("No Chrome or Edge found. Install one, or edit the CHROME list.");
  process.exit(1);
}

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

class CDP {
  constructor(ws) {
    this.ws = ws;
    this.seq = 0;
    this.pending = new Map();
    this.waiters = [];
    ws.addEventListener("message", (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id);
        this.pending.delete(m.id);
        m.error ? reject(new Error(m.error.message || JSON.stringify(m.error))) : resolve(m.result);
        return;
      }
      if (!m.method) return;
      for (const w of this.waiters.splice(0)) {
        w.method === m.method ? w.resolve(m.params) : this.waiters.push(w);
      }
    });
  }

  send(method, params = {}, sessionId) {
    const id = ++this.seq;
    const msg = { id, method, params };
    if (sessionId) msg.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify(msg));
    });
  }

  once(method, timeoutMs = 15000) {
    return new Promise((resolve, reject) => {
      const w = { method, resolve };
      this.waiters.push(w);
      setTimeout(() => {
        const i = this.waiters.indexOf(w);
        if (i >= 0) {
          this.waiters.splice(i, 1);
          reject(new Error(`timed out waiting for ${method}`));
        }
      }, timeoutMs);
    });
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function browserWsUrl(port) {
  // Chrome needs a moment to bind the port; poll rather than guess a delay.
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (r.ok) return (await r.json()).webSocketDebuggerUrl;
    } catch {}
    await sleep(100);
  }
  throw new Error("Chrome never opened its debugging port");
}

async function main() {
  const filter = process.argv[2];
  const shots = filter ? SHOTS.filter((s) => s.id.includes(filter)) : SHOTS;
  if (!shots.length) {
    console.error(`No shot id matches "${filter}". Known: ${SHOTS.map((s) => s.id).join(", ")}`);
    process.exit(1);
  }

  await mkdir(OUT, { recursive: true });
  const profile = path.join(tmpdir(), `cutfill-shots-${process.pid}`);
  const port = 9222 + (process.pid % 500);

  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${profile}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-extensions",
      "--hide-scrollbars",
      // The game is a local file that stores progress in localStorage.
      "--allow-file-access-from-files",
      "--force-color-profile=srgb",
      "--force-device-scale-factor=1",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  let cdp, ws;
  try {
    ws = new WebSocket(await browserWsUrl(port));
    await new Promise((res, rej) => {
      ws.addEventListener("open", res, { once: true });
      ws.addEventListener("error", () => rej(new Error("CDP socket failed")), { once: true });
    });
    cdp = new CDP(ws);

    const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
    await cdp.send("Page.enable", {}, sessionId);
    await cdp.send("Runtime.enable", {}, sessionId);

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
    try { ws?.close(); } catch {}
    chrome.kill();
    await sleep(300);
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }

  console.log(`\nWrote to ${path.relative(ROOT, OUT)}/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

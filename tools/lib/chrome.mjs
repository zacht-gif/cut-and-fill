/**
 * chrome.mjs — the headless-Chrome plumbing shared by the capture tools.
 *
 * Extracted from shots.mjs when gif.mjs needed the same CDP client. A second
 * copy would have been the usual trap: the two would drift, and the one you
 * weren't looking at would be the broken one. Same reasoning as the LEVELS
 * array living only in index.html.
 *
 * Node 24 ships a global WebSocket, so this needs no dependencies and makes no
 * network requests beyond localhost.
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find(existsSync);

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class CDP {
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


export async function browserWsUrl(port) {
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

/**
 * Launch headless Chrome, attach a page session, and hand back everything the
 * caller needs plus a dispose() that always tidies up. The flag list is load
 * bearing: the game is a local file that stores progress in localStorage, and
 * the colour profile and device scale have to be pinned or captures differ
 * between machines.
 */
export async function launch() {
  if (!CHROME) {
    throw new Error("No Chrome or Edge found. Install one, or edit the CHROME list in tools/lib/chrome.mjs.");
  }
  const profile = path.join(tmpdir(), `cutfill-capture-${process.pid}`);
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
      "--allow-file-access-from-files",
      "--force-color-profile=srgb",
      "--force-device-scale-factor=1",
      // Rasterise on the CPU. GPU rasterisation dithers gradients slightly
      // differently between runs — measured as 1-2 levels of drift in the
      // marsh cells and the body backdrop, invisible to the eye but enough to
      // change every byte of the PNG. Captures are supposed to be comparable
      // with a hash, so determinism beats the few hundred ms this costs.
      "--disable-gpu",
      "--disable-gpu-rasterization",
      "--disable-lcd-text",
      "--disable-font-subpixel-positioning",
      // Chrome's own layout tests use this set to make rendering repeatable:
      // it settles every compositor stage before drawing rather than letting a
      // frame be captured mid-pipeline, which is where the last of the drift
      // was coming from — a pixel or two on antialiased glyph edges.
      "--deterministic-mode",
      "--run-all-compositor-stages-before-draw",
      "--disable-threaded-animation",
      "--disable-threaded-scrolling",
      "--disable-checker-imaging",
      "--disable-image-animation-resync",
      "--disable-partial-raster",
      "--disable-skia-runtime-opts",
      "about:blank",
    ],
    { stdio: "ignore" }
  );

  const ws = new WebSocket(await browserWsUrl(port));
  await new Promise((res, rej) => {
    ws.addEventListener("open", res, { once: true });
    ws.addEventListener("error", () => rej(new Error("CDP socket failed")), { once: true });
  });
  const cdp = new CDP(ws);

  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Runtime.enable", {}, sessionId);

  async function dispose() {
    try { ws.close(); } catch {}
    chrome.kill();
    await sleep(300);
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }

  return { cdp, sessionId, dispose };
}

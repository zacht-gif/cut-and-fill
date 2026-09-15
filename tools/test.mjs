/**
 * Headless runner for the game's own self test.
 *
 *   node tools/test.mjs
 *
 * The game is a single HTML file with an inline script, so there is nothing
 * to import. This pulls the script out of index.html and evaluates it against
 * a stub DOM — just enough of one for the page to boot — then calls the
 * selfTest() defined in the page itself.
 *
 * The point is that the assertions live in index.html next to the code they
 * cover, and run identically here and at index.html?test=1. This file only
 * supplies an environment.
 *
 * Exits non-zero on any failure.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const here = dirname(fileURLToPath(import.meta.url));
const HTML = join(here, "..", "index.html");

/* ---------------- the smallest DOM that will boot the page ---------------- */

class El {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this._cls = new Set();
    this.dataset = {};
    this._attrs = new Map();
    this.textContent = "";
    this.title = "";
    this.disabled = false;
    this.onclick = null;
    this.offsetWidth = 0;
    const props = new Map();
    this.style = {
      setProperty: (k, v) => props.set(k, v),
      getPropertyValue: (k) => props.get(k) ?? "",
      removeProperty: (k) => props.delete(k),
      _props: props,
    };
    this.classList = {
      add: (...c) => c.forEach((x) => x && this._cls.add(x)),
      remove: (...c) => c.forEach((x) => this._cls.delete(x)),
      contains: (c) => this._cls.has(c),
      toggle: (c, force) => {
        const on = force === undefined ? !this._cls.has(c) : !!force;
        on ? this._cls.add(c) : this._cls.delete(c);
        return on;
      },
    };
  }
  get className() { return [...this._cls].join(" "); }
  set className(v) {
    this._cls = new Set(String(v).split(/\s+/).filter(Boolean));
  }
  /* aria-label and aria-current ride on the level picker and the drawer
     toggle, so the stub has to hold an attribute even though nothing here
     reads one back. Plain properties were enough until the picker started
     naming itself for a screen reader. */
  setAttribute(k, v) { this._attrs.set(k, String(v)); }
  getAttribute(k) { return this._attrs.has(k) ? this._attrs.get(k) : null; }
  hasAttribute(k) { return this._attrs.has(k); }
  removeAttribute(k) { this._attrs.delete(k); }
  appendChild(c) { this.children.push(c); return c; }
  removeChild(c) { this.children = this.children.filter((x) => x !== c); }
  addEventListener() {}
  removeEventListener() {}
  focus() {}
  getBoundingClientRect() {
    return { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 };
  }
  /** Only class/tag selectors are ever used, and only to reach a child. */
  querySelector(sel) {
    const want = sel.replace(/^\./, "");
    const hit = (e) =>
      e._cls.has(want) || e.tagName === want.toUpperCase();
    const walk = (e) => {
      for (const c of e.children) {
        if (hit(c)) return c;
        const deep = walk(c);
        if (deep) return deep;
      }
      return null;
    };
    return walk(this) ?? new El();     // never null: the page chains off these
  }
  querySelectorAll() { return []; }
  /** Enough parsing to make the page's small innerHTML snippets queryable. */
  set innerHTML(html) {
    this.children = [];
    if (!html) return;
    for (const m of String(html).matchAll(/<(\w+)([^>]*)>/g)) {
      const el = new El(m[1]);
      const cls = /class="([^"]*)"/.exec(m[2]);
      if (cls) el.className = cls[1];
      this.children.push(el);
    }
  }
  get innerHTML() { return ""; }
}

const byId = new Map();
const document = {
  body: new El("body"),
  documentElement: Object.assign(new El("html"), { clientWidth: 1280 }),
  title: "",
  createElement: (t) => new El(t),
  querySelector(sel) {
    if (!byId.has(sel)) byId.set(sel, new El());
    return byId.get(sel);
  },
  querySelectorAll: () => [],
  addEventListener: () => {},
};

const store = new Map();
const localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
  get length() { return store.size; },
};

const sandbox = {
  document,
  localStorage,
  location: { search: "" },
  navigator: { userAgent: "node" },
  innerWidth: 1280,
  innerHeight: 900,
  addEventListener: () => {},
  removeEventListener: () => {},
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
  getComputedStyle: (el) => ({
    getPropertyValue: (k) => el?.style?.getPropertyValue(k) ?? "",
    paddingLeft: "0px", paddingRight: "0px",
    borderLeftWidth: "0px", borderRightWidth: "0px",
    display: "block", overflowX: "visible",
  }),
  setTimeout, clearTimeout, setInterval, clearInterval,
  console, Math, Date, JSON, performance,
  Set, Map, Array, Object, String, Number, Boolean, Promise, Error,
  parseFloat, parseInt, isNaN, structuredClone,
  // the share codes are base64url over UTF-8
  btoa, atob, TextEncoder, TextDecoder, Uint8Array,
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

/* ---------------- boot the page and run its suite ---------------- */

const html = readFileSync(HTML, "utf8");
const script = /<script>([\s\S]*)<\/script>/.exec(html);
if (!script) {
  console.error("could not find the inline <script> in index.html");
  process.exit(1);
}

const ctx = vm.createContext(sandbox);
try {
  new vm.Script(script[1], { filename: "index.html" }).runInContext(ctx);
} catch (e) {
  console.error("the page threw while booting:\n" + (e && e.stack || e));
  process.exit(1);
}

if (typeof ctx.selfTest !== "function") {
  console.error("index.html does not define selfTest()");
  process.exit(1);
}

console.log("Cut & Fill — in-page suite, headless\n");
const results = await ctx.selfTest();
let fails = 0;
for (const r of results) {
  if (!r.pass) fails++;
  console.log(`  ${r.pass ? "PASS" : "FAIL"}  ${r.name}`);
  if (r.detail) console.log(`        ${r.detail}`);
}
console.log();
console.log(fails
  ? `FAIL — ${fails} of ${results.length} checks`
  : `PASS — all ${results.length} checks`);
process.exit(fails ? 1 : 0);

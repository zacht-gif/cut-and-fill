/**
 * publish.mjs — push the game to itch.io with butler, after proving it works.
 *
 *   node tools/publish.mjs            run every check, then push
 *   node tools/publish.mjs --quick    skip the Python solver pass (~2 min)
 *   node tools/publish.mjs --dry-run  run the checks, push nothing
 *
 * Uploading by hand through the dashboard is the step where a rebuild stops
 * being a deploy: the repo can be clean, the tests green, and the thing players
 * load still a month old, because nothing in git touches what itch serves.
 * This makes the upload one command that refuses to run on a broken game.
 *
 * ONE-TIME SETUP, and it cannot be automated from here:
 *
 *   1. butler login
 *      Opens a browser to authenticate against your itch.io account. Interactive
 *      by design — credentials are yours to enter, not a script's.
 *
 *   2. After the FIRST push, open the itch Edit game page and tick
 *      "This file will be played in the browser" for the new channel.
 *      butler cannot set that flag (itch's own docs say so), so until you do,
 *      the pushed build is a DOWNLOAD sitting next to your playable upload.
 *      Check the page actually still plays before deleting the old upload.
 *
 * After that, every later push updates the same channel in place.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, copyFileSync, rmSync, readFileSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = "thornsrl/cut-fill:html5";
/* Reject anything unrecognised rather than ignoring it. A flag this script did
   not understand used to fall straight through to the butler push path, so a
   typo -- or a flag added to the docs before the code -- published to the live
   store page instead of failing. Exactly once was enough. Defaulting to the
   most consequential action on unknown input is the bug; this closes it. */
const KNOWN = new Set(["--quick", "--dry-run", "--zip"]);
const ARGS = process.argv.slice(2);
const unknown = ARGS.filter((a) => !KNOWN.has(a));
if (unknown.length) {
  console.error("PUBLISH FAILED: unrecognised argument" +
    (unknown.length > 1 ? "s" : "") + ": " + unknown.join(", "));
  console.error("        known flags: " + [...KNOWN].join(", "));
  console.error("        nothing was published.");
  process.exit(1);
}

const QUICK = ARGS.includes("--quick");
const DRY = ARGS.includes("--dry-run");
const ZIP = ARGS.includes("--zip");

/* butler is deliberately NOT on PATH — editing PATH on this machine has cost
   time before, and a pinned path is the same on both machines. Still checks
   PATH first, so a system install wins if there is one. */
const BUTLER = [
  "butler",
  "C:/dev/tools/butler/butler.exe",
].find((c) => {
  try { execFileSync(c, ["version"], { stdio: "pipe" }); return true; } catch { return false; }
});

function fail(msg) {
  console.error("PUBLISH FAILED: " + msg);
  process.exit(1);
}

function run(label, cmd, args) {
  process.stdout.write(`  ${label} … `);
  try {
    const out = execFileSync(cmd, args, { cwd: ROOT, encoding: "utf8" });
    console.log(out.trim().split("\n").pop());
  } catch (e) {
    console.log("FAILED");
    fail(`${label} did not pass:\n${e.stdout || e.message}`);
  }
}

/** Zero network requests is the property that lets this run offline, host
 *  anywhere and carry no consent obligations. Enforced here rather than
 *  remembered, because it is invisible until someone plays offline. */
function checkSelfContained() {
  const html = readFileSync(path.join(ROOT, "index.html"), "utf8");
  const body = html.replace(/<!--[\s\S]*?-->/g, "");
  const offenders = [];
  if (/<script[^>]+\bsrc=/i.test(body)) offenders.push("external <script src>");
  if (/<link[^>]+rel=["']?stylesheet/i.test(body)) offenders.push("external stylesheet");
  if (/@import\s+url\(/i.test(body)) offenders.push("CSS @import");
  // The play link is a real https URL and belongs there; anything else is not.
  const urls = (body.match(/https?:\/\/[^"'\s)]+/gi) || [])
    .filter((u) => !u.startsWith("https://thornsrl.itch.io")
                && !u.startsWith("http://www.w3.org"));
  if (urls.length) offenders.push("http(s) URL: " + urls[0]);
  if (offenders.length) {
    fail("index.html is no longer self-contained: " + offenders.join(", "));
  }
}

function main() {
  if (!BUTLER && !ZIP && !DRY) {
    fail("butler not found. Install it to C:/dev/tools/butler/, or put it on PATH.\n" +
         "        https://broth.itch.zone/butler/windows-amd64/LATEST/archive/default");
  }

  console.log("Checking the game before it goes anywhere");
  process.stdout.write("  self-contained … ");
  checkSelfContained();
  console.log("ok");
  run("regression suite", process.execPath, [path.join(ROOT, "tools", "test.mjs")]);
  if (QUICK) {
    console.log("  ! solver pass skipped (--quick) — pars are unverified in this build");
  } else {
    run("every level solvable, every par optimal", "py", ["-3", path.join(ROOT, "tools", "validate.py")]);
  }

  if (DRY) {
    console.log("\n--dry-run: checks passed, nothing pushed.");
    return;
  }

  if (ZIP) {
    // itch requires index.html at the ZIP ROOT. Nested inside a folder, the
    // upload plays as a file listing instead of a game.
    const dist = path.join(ROOT, "dist");
    mkdirSync(dist, { recursive: true });
    const zipPath = path.join(dist, "cut-fill.zip");
    rmSync(zipPath, { force: true });
    const stage = path.join(tmpdir(), "cutfill-zip-" + process.pid);
    rmSync(stage, { recursive: true, force: true });
    mkdirSync(stage, { recursive: true });
    copyFileSync(path.join(ROOT, "index.html"), path.join(stage, "index.html"));
    execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command",
      "Compress-Archive -Path '" + path.join(stage, "*") + "' -DestinationPath '" + zipPath + "' -Force"],
      { stdio: "pipe" });
    rmSync(stage, { recursive: true, force: true });
    console.log("");
    console.log("  " + path.relative(ROOT, zipPath) + "  " +
                (statSync(zipPath).size / 1024).toFixed(0) + " KB  (index.html at the root)");
    console.log("");
    console.log("Upload it with the play-in-browser box ticked.");
    return;
  }

  // butler pushes a directory, so stage exactly what ships: the game, and
  // nothing else. The harness, tools and docs stay out.
  const stage = path.join(tmpdir(), `cutfill-publish-${process.pid}`);
  rmSync(stage, { recursive: true, force: true });
  mkdirSync(stage, { recursive: true });
  copyFileSync(path.join(ROOT, "index.html"), path.join(stage, "index.html"));

  console.log(`\nPushing to ${TARGET}`);
  try {
    const out = execFileSync(BUTLER, ["push", stage, TARGET], { encoding: "utf8" });
    console.log(out.trim());
  } catch (e) {
    const text = (e.stdout || "") + (e.stderr || "") + (e.message || "");
    if (/no credentials|not logged in|authenticate/i.test(text)) {
      fail("butler is not logged in. Run this once, in your own terminal:\n" +
           `        ${BUTLER} login`);
    }
    fail("butler push failed:\n" + text);
  } finally {
    rmSync(stage, { recursive: true, force: true });
  }

  // Half a deploy. itch holds the new build until Zach goes on itch and
  // checks the game page; until then players still get the previous build.
  // Printing just 'Pushed' here reported success at a moment it was false,
  // and one build sat overnight because nobody knew this step existed.
  console.log("");
  console.log("Pushed - but NOT live yet.");
  console.log("");
  console.log("  Go on itch and check the game page. Until you do, players keep");
  console.log("  getting the previous build, and nothing here can finish it for you.");
  console.log("");
  console.log("      https://thornsrl.itch.io/cut-fill");
  console.log("");
  console.log("Then confirm the upload actually swapped:");
  console.log("");
  console.log("  curl -s https://itch.io/embed-upload/19217413 | grep -o 'html/19217413-[0-9]*'");
  console.log("");
  console.log("If this was the FIRST push, the build is a download until you tick");
  console.log("'This file will be played in the browser' on the itch Edit game page.");
}

main();

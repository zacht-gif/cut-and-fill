# cut-and-fill — read this before changing anything

A grid puzzle about pushing dirt into holes while traffic runs on a timer,
shipped as one self-contained HTML file. `C:\dev\CLAUDE.md` above this covers
machines, git identity and syncing; this file is only about the game.

| | |
|---|---|
| `index.html` | the entire game — rules, solver, levels, editor, sound, UI. No build step |
| `tools/validate.py` | proves every level solvable and every par optimal. The authoring engine |
| `tools/test.py` | the regression suite. Runs both halves; `--py-only` skips the JS one |
| `tools/test.mjs` | the JS half — boots the page against a stub DOM, runs `selfTest()` |
| `tools/analyze.py` | measures trap density and lethality. This is what orders the campaign |
| `tools/shots.mjs` | renders the store imagery out of the real game over CDP |

The one command before a commit:

```bash
py -3 tools/test.py
```

**It is not open source.** The repo is public; the licence is proprietary, all
rights reserved, and that explicitly covers the level designs. Public repo,
closed licence — don't treat an incoming PR or a copied snippet as welcome by
default.

---

## The rules that are not style preferences

**The rules exist twice, on purpose.** `step()` in `index.html` is the game;
`tools/validate.py:239` mirrors it for authoring. The redundancy is the whole
point — an independent implementation is what makes a proven par worth
anything — but it is only worth something because `SOLUTIONS` is replayed
through *both*. Change a rule in one engine and you must change it in the
other, or the validator will keep certifying pars the game no longer honours.
`tools/test.py` is the thing that catches the drift. Never "fix" a divergence
by editing whichever side is complaining.

**`SOLUTIONS` is generated, not written.** It is the regression contract, one
reference solution per level on the Operator shift, at `index.html:870`.
Regenerate with `py -3 tools/validate.py --emit` and paste the result — never
hand-edit an entry to make a test pass. A hand-tuned solution that happens to
win is exactly the thing the contract exists to rule out.

**Level data has one home and it is `index.html`.** The Python tools parse the
`LEVELS` array straight out of the HTML rather than keeping a copy.
`tools/solutions.json` is a generated export and is gitignored for the same
reason.

**`step()` must stay side-effect free.** The in-page solver calls it hundreds
of thousands of times. Haptics and sound fire from the UI layer only — that
separation is load-bearing, not tidiness, and it is why a hint doesn't buzz
your phone a hundred times.

**Campaign order is measured, not guessed.** Levels are ordered by trap × par
— the effort you expect to lose to a ruined run — because `analyze.py` showed
par is not just a weak difficulty proxy here, it's *inverted*: the three
longest chapter-one levels were the three safest, while a 5-move tutorial sat
at 64% trap. Long levels are open rooms with room to recover; short ones are
tight single-load puzzles where most mistakes are quietly fatal. Re-run
`analyze.py` before reordering anything, and don't reach for par.

**Zero network requests is a feature with teeth.** It is what lets the game run
offline, host anywhere, and carry no consent obligations. `ADS={enabled:false}`
at `index.html:908` reserves slot *space* without loading anything — the space
is reserved up front so a slow ad can never shove the board mid-move. Switching
it on ends all three properties at once. Sound is synthesised and the favicon is
an inline data URI for the same reason: no asset files.

**Don't bump `SAVE_KEY` casually.** It is `"cutfill.v4"` and `load()` has no
migration path — it reads the key and defaults whatever is missing. The game is
published and people have progress. A bump silently orphans all of it.

**`PLAY_URL` is the one place the play link lives** (`index.html:893`). It rides
on every shared result, so it must be the canonical itch page — `location.href`
on itch resolves to a throwaway `html-classic.itch.zone` sandbox URL nobody can
visit.

---

## Things that have cost real time

- **`validate.py` takes over two minutes** on the full campaign. It has not
  hung. Budget for it, or scope it with `--diff`.
- **A rebuild is not a deploy.** itch serves whatever `index.html` was last
  *uploaded* through its dashboard; nothing about committing or pushing touches
  it. To check what players actually have, fetch the embed URL and diff it
  against local — the only legitimate difference is itch's injected
  `htmlgame.js`.
- **itch's description field is rich text, not Markdown.** Pasting Markdown
  puts literal `###` and `**` on the live page, which is what happened at
  launch and stood for a month. The paste-ready copy is
  `assets/itch-description.txt`; `ITCH-IO-PAGE.md` is the readable source.
  Format with the editor's own toolbar.
- **Screenshots: close the drawer before `loadLevel`.** `fitCell()`
  (`index.html:1804`) sizes the board from whatever vertical room is left after
  every visible sibling, and the levels drawer is open by default and eats most
  of it. `shots.mjs` also has to emulate touch, or the vibration and touch-mode
  rows hide themselves and the capture quietly denies two settings the game has.
- **`assets/screenshots/` is generated and gitignored**, so it does not travel
  between machines. `node tools/shots.mjs` rebuilds it; `shots.mjs cover` does
  just the cover. Storing the PNGs would only let them drift from the game.
- **Empty search results.** The root `CLAUDE.md` gotcha applies here as much as
  anywhere: prove the search matched something before trusting a clean result.

---

## Publishing

| | |
|---|---|
| **Canonical** | https://thornsrl.itch.io/cut-fill — account `thornsRL`, slug `cut-fill` |
| **Mirror** | https://zacht-gif.github.io/cut-and-fill/ — live off `main`, deliberately unpromoted |
| **Repo** | https://github.com/zacht-gif/cut-and-fill (public) |

The Pages mirror stays out of the README, announcements and shared text on
purpose: itch ranks partly on plays and views, so a play landing on Pages is a
discovery signal itch never sees. Its absence is a decision — the reasoning is
written into `LAUNCH-CHECKLIST.md` next to the announcement template so it does
not get quietly undone.

There is no `og:image` for the same family of reasons: a scraper reading an itch
link builds its card from itch's own cover art, so one in the HTML would never
be seen. If a second URL ever gets promoted, that changes.

The itch page declares **AI Disclosure: AI Assisted, Code**, which matches the
`Co-Authored-By: Claude` trailers in the public history. Keep those two honest
with each other.

`PUBLICATION.md`, `PUBLICATION-SUMMARY.md`, `LAUNCH-CHECKLIST.md` and
`BROWSER-COMPATIBILITY.md` are post-launch records, not to-do lists — their
unticked boxes are historical.

---

## Where things stand

Released August 2026 and stable. As of 2026-09-12: 56/56 JS checks pass, all 25
levels proved solvable on all three shifts with every par optimal, the build
deployed on itch is byte-identical to `index.html`, and there are no open
issues.

The real gap is reach, not code. 0 stars, 0 forks, no itch comments, and the
"Day 2-3 social push" in `LAUNCH-CHECKLIST.md` never happened — which is the
only thing standing between the game and its own success metric of 100+ plays
in month one.

Phase 2 ideas, none started, are listed at the end of `LAUNCH-CHECKLIST.md`.
Anything added there has to keep the four properties above: one file, no
dependencies, no network, no build step.

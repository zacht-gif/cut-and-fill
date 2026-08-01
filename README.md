# Cut & Fill

A grading puzzle. You drive a bulldozer around a site grid, pushing dirt into
holes until the whole site is level — without sinking it, getting run over, or
causing a wreck.

Open `index.html` in any browser. No install, no build step, no server.

## Rules

- Push a **dirt pile** into a **hole** and it drops in. The hole is filled
  permanently and becomes drivable ground.
- **Dirt is consumed when it drops in.** You never get it back, which is what
  separates this from ordinary box-pushing — a wasted load can make the level
  unwinnable.
- You can only push, never pull, and only one pile at a time.
- The dozer won't drive into an open hole.
- Fill every hole to clear the level.

### Soft ground

Teal cells are unstable ground.

- **Drive in and the run ends.** It doesn't hold a dozer.
- **Dirt pushed in is swallowed** — it doesn't fill anything and it's gone for
  good. Nothing stops you dumping a load in there, so it's a live trap.

### Traffic

White vehicles patrol marked haul roads.

- Traffic advances **one step for every turn you take**, including a wait.
  Nothing moves while you're thinking.
- **Red cells show exactly where traffic lands next turn.** Timing is
  information, not reflexes or guesswork. (The Foreman shift turns these off.)
- A vehicle reaching your cell ends the run. So does slipping straight through
  one head-on.
- **Leave dirt sitting in a live lane and a vehicle piles into it** — wreck,
  run over. Cross a road in one continuous push; don't park a load on it.
- Vehicles have their own speeds. A small dark bar on a vehicle marks it as a
  slow one that only moves every other turn (or every third), so lanes drift in
  and out of sync. You cannot drive into an occupied cell, or push dirt into one.

Since traffic only moves when you do, `Space` — wait a turn — is a real move.
Most traffic levels need it.

### Gates

Yellow-edged gaps in the site boundary. Traffic drives in and out through them;
**the dozer may not enter a gate, and neither may its dirt.** They're live
roadway, not a shortcut off site.

Gated roads use *off-map staging*: a vehicle drives out through one gate, spends
a few turns off site, then drives back in through the other. So the gap between
passes is real elapsed time rather than a sprite teleporting across the board.

### Tempo

Some later sites have a clock. Once you pass a set turn, **every vehicle speeds
up one notch, and again periodically after that**, until the whole site is
running flat out. The **Tempo** readout shows the current multiplier and turns
red once it starts climbing.

Dawdling is what triggers it. Play briskly and you may finish before it ever
bites; sit and think for twenty turns and you'll be crossing a much busier site
than you started on.

## Shifts (difficulty)

Picked on first run, and switchable any time from the header.

| Shift | Tempo | Red warning cells |
|-------|-------|-------------------|
| **Apprentice** | never ramps up | shown |
| **Operator** | ramps as authored | shown |
| **Foreman** | ramps sooner and harder | **hidden** |

The shift only changes traffic tempo and whether the warning cells are drawn.
It never alters the grid, the dirt, or the holes — so a level is the same puzzle
on every shift, and best scores are tracked per shift.

Note that a slower shift is not automatically easier: a slow vehicle sitting in
the cell you need to push through blocks you for *longer*. That's why every
level is proved solvable on all three rather than assumed safe on the easy one.

## Controls

| Action  | Keys                           |
|---------|--------------------------------|
| Drive   | arrow keys or `WASD`, or swipe |
| Wait a turn | `Space` or `.`, or tap the board |
| Undo    | `Z` or `U`                     |
| Restart | `R`                            |
| Hint    | `H`                            |
| Next level (after a win) | `Enter`       |
| Change shift | click the shift name in the header |

On touch screens, swipe the board to drive, tap to wait, or use the on-screen pad.

**Haptics** fire on the four moments that carry meaning — a blocked push, a load
dropping in, a run ending, a site finished — and stay silent on ordinary moves,
since buzzing every keystroke is irritating and drains the battery. Toggle it
from the header. The toggle only appears on touch devices that support
vibration: desktop Chrome exposes the API but does nothing with it, and iOS
Safari has no vibration API at all, so this is Android in practice.

Undo works after a fatal move too — the fail screen offers it directly, so a
misjudged crossing costs you one keypress, not the level.

Progress and your best move count per level are saved in `localStorage`, and
the game reopens on the last level you played.

Scores are keyed by **level name**, not position, so reordering the campaign
doesn't reattach your stars to the wrong puzzles. (`tools/test.py` enforces that
names stay unique, which is what makes that safe.)

## Levels

25 levels in three chapters:

- **1–13** — pure grading. Push, plan, don't strand your dirt.
- **14–19** — soft ground and live traffic.
- **20–25** — gated haul roads and a tempo that climbs the longer you take.

Play order follows measured cost, not par — see below.

Every level ships with a **par equal to its proven optimal solution**, found by
exhaustive search on the Operator shift. Par is genuinely achievable, never a
guess. Several traffic levels have zero slack at par.

### Stars

| Stars | Finish in |
|-------|-----------|
| ★★★ | par or better |
| ★★☆ | within 25% over par |
| ★☆☆ | anything, as long as you finish |

Stars are derived from your best move count rather than stored, so improving a
time upgrades the rating immediately. The running total sits in the header, and
the win screen tells you what the next star would cost. Because par is a proven
optimum, three stars means you genuinely cannot do better — not that you beat a
number someone guessed.

A ◆ next to a level's stars means you cleared it unaided.

The optimal move count happens to come out the same on all three shifts — an
optimal route can be re-timed to survive any tempo. What the harder shifts take
away is margin, not theoretical possibility.

## Random and daily sites

Buttons under the board generate fresh sites.

- **Daily Site** — seeded from the date, so the same board comes up for everyone
  on a given day, and your best is recorded for it.
- **Random: Easy / Medium / Hard** — a throwaway site. Hard tiers can include
  soft ground and a gated haul road. Not recorded.

Random push-puzzles are normally a bad idea: most configurations are either
unsolvable or trivial. These aren't random *boards* — they're random candidates
run through the solver, and only kept when the optimum lands inside a target
band for the tier. So a generated site is proven solvable and comes with a real
par, exactly like a hand-built one. Generation typically takes a handful of
candidates (a few ms to under a second).

## Objectives

Every site carries the same three, shown above the board and updating live:

| | |
|---|---|
| **Fill every hole** | the win condition |
| **Finish at par (N)** | the third star |
| **No hint, no undo** | an unaided run, marked ◆ in the level picker |

Each one shows as open, met, or — once it's out of reach for this run — struck
through, so you know immediately whether a restart is worth it rather than
finding out at the end.

Undoing when there's nothing to undo doesn't count against the unaided
objective. Undoing nothing isn't assistance.

## Hints

`H` or the Hint button works out a way forward from wherever you are — not just
from the opening, so it's still useful twenty moves in.

**Hints are earned.** You start with three, and **finishing a site at par pays
for one more**. Each site pays out once per shift, so replaying an easy level
can't farm them — but replaying it on a harder shift can.

That ties the assistance to the mastery: the thing that earns you a hint is
exactly the thing that proves you didn't need it. Beginners still get a stock to
start with, so nobody is locked out of help on the level they're stuck on, and
spending one only costs the unaided objective — never a star.

It runs breadth-first first, and will tell you the exact number of moves
remaining when it can prove it. On the four largest chapter-one boards that
search is too big for a browser, so it falls back to a best-first search and
says so — it gives you *a* way through rather than claiming a shortest one.

If a position is genuinely hopeless it says so. Crucially, it only says that
when it has searched the whole space; running out of budget reports differently.
Telling you a live position is dead would be worse than saying nothing.

If you shove a load somewhere it can never reach a hole from, a banner tells you
the site can't be finished. The check is deliberately conservative — it ignores
traffic and the dozer's position, so it only fires when the dirt is *provably*
stranded and will never nag you about a position that's still winnable.

## Ad slots

Two are reserved: `#adTop` and `#adBottom`, at IAB leaderboard (728×90) on
desktop and mobile banner (320×50) below 800px. On phones the bottom unit
anchors to the viewport instead of eating scroll height, and the body reserves
the same height so nothing hides behind it.

They're hidden until you switch them on:

```js
const ADS = { enabled: false };     // near the top of the <script>
```

Or append `?ads=1` to preview the reserved space without committing to it.

The space is reserved *before* anything loads, and `fitCell()` subtracts
whatever the slots occupy so the board shrinks to fit rather than overflowing.
That matters more here than on a page you only read: an ad arriving late and
shoving the board down mid-move makes the player mis-tap.

**Before switching this on**, know what it costs. The game currently makes zero
network requests, which is what lets it run offline, host anywhere including
under a strict CSP, and carry no cookie-consent obligations. An ad network's
script ends all three at once. Reserving the space costs nothing; loading a
network is the decision.

## Adding a level

Levels live in the `LEVELS` array near the top of the `<script>` in
`index.html`. The grid is plain ASCII:

| Char    | Meaning     |
|---------|-------------|
| `#`     | wall        |
| (space) | ground      |
| `o`     | hole        |
| `$`     | dirt pile   |
| `@`     | dozer       |
| `~`     | soft ground |
| `=`     | gate (traffic only) |

```js
{ name:"My Level", par:9, rows:[
  "#########",
  "#@      #",
  "#   $   #",
  "#       #",
  "#   o   #",
  "#########"],
  traffic:[{r:3,c:1,dir:1,len:7,mode:"wrap",every:1,at:0,offset:0}]},
```

Rows may be ragged; short rows are padded with wall.

Traffic is declared separately because it carries timing. A vehicle walks a
straight run of `len` cells starting at `(r,c)` heading `dir` (`0` up, `1`
right, `2` down, `3` left), then either wraps back to the start or bounces
back:

| Field    | Meaning                                                  |
|----------|----------------------------------------------------------|
| `r`, `c` | first cell of the run                                    |
| `dir`    | direction of travel, `0`–`3`                             |
| `len`    | how many cells long the run is                           |
| `mode`   | `"wrap"` (drives off one end, reappears) or `"bounce"`   |
| `every`  | turns per cell — `1` is fast, `2` is half speed          |
| `at`     | starting index along the run                             |
| `offset` | shifts the phase without moving the start                |
| `stage`  | turns spent off site before re-entering (wrap only)      |

For a busy road, declare several vehicles on the same run with different `at`
values — that's how the lane density in *Rush Hour* is built. Give them the same
`every`, or they'll drift into each other; the validator rejects that.

For a gated road, start the run *on* the boundary and give it `stage`:

```js
rows:[ "##########",
       "#@       #",
       "=        =",     // gates at both ends of row 2
       "#   o    #",
       "##########" ],
traffic:[{r:2,c:0,dir:1,len:10,mode:"wrap",every:1,at:0,offset:0,stage:5}]
```

That vehicle crosses the site in 10 turns, sits off-map for 5, then re-enters.
The validator checks that a run leaving the grid does so through a `=` gate.

To make a site speed up the longer it takes, add:

```js
escalate:{after:12, every:6, floor:1}
```

Every vehicle gains a notch of speed at turn 12 and every 6 turns after, down to
a floor of 1 turn per cell. The Foreman shift roughly halves `after` and `every`.

Then check it:

```bash
py -3 tools/validate.py
```

The validator reads the levels straight out of `index.html` — there is no
second copy of the data to keep in sync. It proves each level solvable **on all
three shifts**, tells you the correct `par` if the declared one is wrong, and
catches authoring mistakes: a missing dozer, a lane routed through a wall, a
hole or soft ground, a run that exits the grid somewhere that isn't a gate, a
vehicle spawned on top of the dozer, or two vehicles that would collide. It
exits non-zero on any problem, so it works as a pre-commit check.

```bash
py -3 tools/validate.py --paths          # print a solution per level per shift
py -3 tools/validate.py --diff foreman   # check a single shift
```

(`.` in a solution means wait.)

Its search mirrors the game's `step()` function exactly, including traffic
phase, staging, escalation and collisions. All 24 shipped solutions were
replayed through the real page to confirm the two agree — each one wins on
exactly the par move count.

## How traffic stays solvable

A vehicle's position is a pure function of the turn number, never stored state.
So a level's full state is `(dozer, dirt, filled, turn)`, and normally the turn
only matters modulo the least common multiple of the vehicle cycles — a finite
state space.

Escalation breaks that, because speed then depends on the *absolute* turn. The
fix is that escalation saturates: once every vehicle has bottomed out at the
floor speed, the system is periodic again. So the validator tracks the turn
exactly up to that saturation point and modulo the settled period thereafter.
That's exact rather than a cutoff, which is what lets par remain a *proven*
optimum on escalating levels instead of a best-effort guess.

This is also why undo stays exact on a level whose traffic is speeding up:
rewinding the turn counter rewinds the tempo with it.

The game folds every turn into that settled window before looking a vehicle up,
so traffic behaves correctly at any turn count rather than only for a
precomputed stretch.

## Tests

```bash
py -3 tools/test.py
```

Runs both halves and exits non-zero on any failure, so it can gate a commit.
It finds node automatically — including a fresh install that a long-running
shell hasn't picked up yet — and skips the JavaScript half with a note if
there's no runtime.

| | |
|---|---|
| **Python half** (`tools/test.py`) | every level parses and is solvable on all three shifts; every `par` is the true optimum; every reference solution replays through the Python rules to a win at par; data integrity |
| **JavaScript half** (`tools/test.mjs`) | boots the real page against a stub DOM and runs the `selfTest()` defined *inside* `index.html`: the same solutions replayed through the game's own `step()`, the in-page solver against recorded pars, the three fatal outcomes, undo, star thresholds, picker reuse, and the site generator |

The assertions live in `index.html` next to the code they cover; `test.mjs`
only supplies an environment. The same suite runs in a browser at
`index.html?test=1`, which renders a pass/fail report.

Both halves read the `SOLUTIONS` array out of `index.html`, so there's a single
source of truth. Regenerate it after changing levels with:

```bash
py -3 tools/validate.py --emit
```

A note on writing these tests: the fatal-outcome checks *search* for a move
sequence that triggers each failure rather than hard-coding one. An earlier
version hard-coded them, and they silently rotted the moment a level's traffic
was retimed — the test failed while the game was fine.

## Two solvers, one set of rules

There are two searches — `tools/validate.py` for authoring, and one inside
`index.html` for hints and generation — but only **one implementation of the
rules**. The in-page solver drives the very same `step()` the player does, so a
solution it finds is a solution the game accepts by construction.

The Python side is a deliberate reimplementation, which makes it a cross-check
rather than a copy. They're kept honest against each other: the browser solver
independently reproduces Python's optimal count on all 20 levels it can finish,
and every shipped solution replays through the live page at exactly par.

The four largest chapter-one boards exceed what a browser BFS can hold — Python
needs millions of states for those. That's a capacity limit, not a disagreement,
and the code reports it as one.

### Why the big boards can't be brute-forced in a browser (measured)

Worth writing down, because it looks like an easy win and isn't.

Where dirt can be pushed depends only on walls, gates and soft ground, so that
relation is precomputed once per level as a bitmask per square (`buildReach`).
The per-turn "is any dirt stranded" check is then a single AND — about **180×
cheaper** than the flood fill it replaced, and verified identical across ~11,700
real positions.

The hope was that making the check nearly free would let the *solver* use it as
a deadlock prune and crack the four capped levels. It doesn't, and the numbers
say why:

| Level | squares that can reach every hole | squares that can reach none | prune fires |
|---|---|---|---|
| Yard Work | 18 of 40 | **0** | **0.00%** |
| Final Grade | 17 of 44 | 10 | 1.36% |
| Graveyard Shift | 30 of 58 | 18 | 0.74% |

Yard Work is an open room: there is no square from which dirt cannot reach a
hole, so the prune has nothing to cut. These levels are hard for the search
because of combinatorial *breadth* — four piles loose in an open room — not
because they are full of traps. Raising the budget doesn't rescue it either:
3,000,000 states took 6.6 s and 1 GB of heap and still didn't finish.

So the best-first fallback stays the answer for those boards. It finds a way
through in ~50 ms, and on Yard Work it happens to return the optimal 30 anyway.
The precompute was still worth keeping for the render path; it just doesn't buy
what it looked like it would.

## Accessibility

Board state never depends on hue alone. Open pits are marked **▾** and filled
ones **✓**; the next-turn traffic warning carries diagonal hazard stripes rather
than only turning red. Soft ground has its own ripple texture and haul roads
their centerlines, so the whole board is legible with any form of colour vision.

## Files

```
cut-and-fill/
  index.html            the whole game — markup, styles, logic, self test
  tools/test.py         full regression suite (runs both halves)
  tools/test.mjs        headless runner for the in-page suite
  tools/validate.py     level solver / par checker / --emit
  tools/analyze.py      difficulty measurement (trap density, lethality)
  tools/solutions.json  generated solutions, from --json
  README.md
```

## Measuring difficulty

```bash
py -3 tools/analyze.py                 # all levels
py -3 tools/analyze.py --by cost       # ranked by suggested play order
py -3 tools/analyze.py --levels 8,12   # just these
```

Par measures how *long* a level is, which is not how hard it is. This measures
two things par can't see:

**Trap density** — the share of reachable positions from which the site can no
longer be finished. The "I ruined this twenty moves ago and didn't notice" axis.
Computed exactly: enumerate every reachable position, mark the ones with a
winning move, then sweep that backwards to a fixed point; whatever is left can
never reach a win.

**Lethality** — the share of available moves that end the run outright, by
sinking, being run over, or wrecking a truck. The "one wrong keystroke" axis.
It's invisible to trap density, because a fatal move never becomes a reachable
position.

Both are shares of the reachable space, so they compare across levels of very
different sizes.

**Cost** (`--by cost`) combines trap density with par: roughly the effort you
expect to lose to a ruined run — how likely you are to wreck it, times how much
work is gone when you do. Neither factor orders levels sensibly on its own. A
4-move level can be trap-dense and still painless, because restarting costs
nothing; a 66-move level at the same density is brutal. Ordering by cost is what
the campaign order is based on.

### Two design rules this measurement produced

**Give tutorial levels a spare piece.** A level that teaches a mechanic by
handing you exactly one load punishes you for learning. Corner Work measured 64%
trap and Soft Ground 72% — both among the worst boards in the game, both in the
first three levels of their chapter. A second usable load took them to 45% and
38% without changing what they teach.

**Check the spare is actually reachable.** The first spare added to Soft Ground
sat on the bottom row, where nothing can be pushed up into the goal's row — the
dozer would have to stand outside the map. It looked like a fix and measured
like nothing (72% → 70%). Re-measure after every level edit; a change that looks
right and does nothing is the easy failure here.

### A trap in measuring traps

The first version of this tool capped the enumeration and reported a number
anyway. Five levels came back at exactly 100% trap density, which was pure
artefact: positions the search never expanded have no recorded successors, so
they masquerade as dead ends. Truncation doesn't bias the figure slightly, it
drives it to 100%.

Enumerating those levels properly (3–4 million positions each) put Yard Work at
**16%**, not 100%. So the tool now regenerates successors instead of storing
edges — the state set fits in memory, the edge set doesn't — and reports no
number at all when it can't finish, rather than a confident wrong one.

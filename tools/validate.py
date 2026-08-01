"""Validate every Cut & Fill level and check the declared par.

Reads the LEVELS array straight out of ../index.html, so there is no second
copy of the level data to keep in sync.

    py -3 tools/validate.py               # check every level on every shift
    py -3 tools/validate.py --paths       # also print a solution
    py -3 tools/validate.py --diff foreman

The search mirrors step() in index.html exactly: soft ground, gates, traffic
timing and staging, collisions, escalation, and the wait action.

Keeping the state space finite
------------------------------
A vehicle's position is a pure function of the turn number, so a level's state
is (dozer, dirt, filled, turn). Without escalation the turn only matters modulo
the least common multiple of the vehicle cycles. Escalation breaks that, since
speed then depends on the absolute turn — but only until every vehicle bottoms
out at the floor speed. After that saturation point the system is periodic
again, so the turn is tracked exactly up to saturation and modulo the settled
period thereafter. That is exact, not an approximation, which is what lets par
stay a proven optimum on escalating levels.

Par is the optimum on the Operator shift. Every level is additionally proved
solvable on all three shifts. Exit code is non-zero on any problem, so this
works as a pre-commit check.
"""

import argparse
import json
import math
import re
import sys
from collections import deque
from pathlib import Path

HTML = Path(__file__).resolve().parent.parent / "index.html"

# Must match the game's DIRS order: up, right, down, left. 4 == wait.
DIRS = ((-1, 0), (0, 1), (1, 0), (0, -1))
LETTER = "URDL."
WAIT = 4

DIFFS = {
    "apprentice": dict(esc=None),
    "operator":   dict(esc="as-authored"),
    "foreman":    dict(esc="harsh"),
}
DIFF_ORDER = ["apprentice", "operator", "foreman"]
PAR_DIFF = "operator"


# --------------------------------------------------------------------------
# reading levels out of the page
# --------------------------------------------------------------------------
def read_levels(path=HTML):
    src = path.read_text(encoding="utf-8")
    start = src.index("const LEVELS")
    end = src.index("/* Difficulty only ever changes", start)
    block = src[start:end]
    block = block[block.index("["):block.rindex("]") + 1]
    block = re.sub(r"/\*.*?\*/", "", block, flags=re.S)
    block = re.sub(r"//[^\n]*", "", block)
    block = re.sub(r"([{,]\s*)([A-Za-z_]\w*)\s*:", r'\1"\2":', block)
    block = re.sub(r",(\s*[}\]])", r"\1", block)
    try:
        data = json.loads(block)
    except json.JSONDecodeError as e:
        raise SystemExit(f"could not parse the LEVELS array: {e}")
    if not data:
        raise SystemExit(f"no levels found in {path}")
    return data


def lcm(a, b):
    return a * b // math.gcd(a, b)


def esc_for(level, diff):
    """Mirrors escFor() in index.html."""
    e = level.get("escalate")
    mode = DIFFS[diff]["esc"]
    if not e or mode is None:
        return None
    if mode == "harsh":
        return dict(after=max(4, math.ceil(e["after"] * 0.5)),
                    every=max(2, math.ceil(e["every"] * 0.5)),
                    floor=e["floor"])
    return dict(e)


def eff_every(v, t, esc):
    if not esc or t < esc["after"]:
        return v["every"]
    tier = 1 + (t - esc["after"]) // esc["every"]
    return max(esc["floor"], v["every"] - tier)


def build_vehicles(level, esc, w, h):
    out = []
    for v in level.get("traffic", []):
        dr, dc = DIRS[v["dir"]]
        cycle = []
        for i in range(v["len"]):
            r, c = v["r"] + dr * i, v["c"] + dc * i
            cycle.append(None if not (0 <= r < h and 0 <= c < w) else (r, c))
        if v.get("mode", "wrap") == "bounce":
            cycle += [cycle[i] for i in range(v["len"] - 2, 0, -1)]
        else:
            cycle += [None] * v.get("stage", 0)
        out.append(dict(cycle=cycle, every=v.get("every", 1),
                        at=v.get("at", 0), offset=v.get("offset", 0),
                        dir=v["dir"], len=v["len"], r=v["r"], c=v["c"]))
    return out


def timing(vehicles, esc):
    """Return (t_sat, period, limit) and fill each vehicle's advance table.

    t_sat is the first turn from which every vehicle sits at the floor speed;
    beyond it the whole system repeats with `period`.
    """
    if not vehicles:
        return 0, 1, 1
    if esc:
        t_sat = 0
        while any(eff_every(v, t_sat, esc) != esc["floor"] for v in vehicles):
            t_sat += 1
        settled = esc["floor"]
    else:
        t_sat, settled = 0, None

    period = 1
    for v in vehicles:
        step_every = settled if settled is not None else v["every"]
        period = lcm(period, len(v["cycle"]) * step_every)
    limit = t_sat + period

    for v in vehicles:                       # advance table over every phase
        adv = [0] * (limit + 1)
        a = 0
        for t in range(limit):
            if (t + v["offset"]) % eff_every(v, t, esc) == 0:
                a += 1
            adv[t + 1] = a
        v["adv"] = adv
    return t_sat, period, limit


def vpos(v, phase):
    return v["cycle"][(v["at"] + v["adv"][phase]) % len(v["cycle"])]


WALL, GROUND, HOLE, MARSH, GATE = 0, 1, 2, 3, 4


def parse(level, diff):
    rows = level["rows"]
    h = len(rows)
    w = max(len(r) for r in rows)
    rows = [r.ljust(w, "#") for r in rows]
    walls, holes, marsh, gates, piles = set(), set(), set(), set(), set()
    dozer = None
    for r in range(h):
        for c in range(w):
            ch = rows[r][c]
            if ch == "#":
                walls.add((r, c))
            elif ch == "~":
                marsh.add((r, c))
            elif ch == "=":
                gates.add((r, c))
            elif ch == "o":
                holes.add((r, c))
            elif ch == "$":
                piles.add((r, c))
            elif ch == "@":
                dozer = (r, c)
    if dozer is None:
        raise ValueError("no dozer '@'")
    if not holes:
        raise ValueError("no holes 'o'")

    esc = esc_for(level, diff)
    vehicles = build_vehicles(level, esc, w, h)
    t_sat, period, limit = timing(vehicles, esc)

    lv = dict(w=w, h=h, walls=walls, holes=holes, marsh=marsh, gates=gates,
              piles=frozenset(piles), dozer=dozer, vehicles=vehicles,
              esc=esc, t_sat=t_sat, period=period, limit=limit)

    # ---- authoring sanity ----
    for i, v in enumerate(vehicles):
        for cell in v["cycle"]:
            if cell is None:
                continue
            if cell in walls:
                raise ValueError(f"traffic[{i}] drives through a wall at {cell}")
            if cell in marsh:
                raise ValueError(f"traffic[{i}] drives through soft ground at {cell}")
            if cell in holes:
                raise ValueError(f"traffic[{i}] drives through a hole at {cell}")
        if vpos(v, 0) == dozer:
            raise ValueError(f"traffic[{i}] starts on top of the dozer")
        if vpos(v, 0) in piles:
            raise ValueError(f"traffic[{i}] starts on top of a dirt pile")
        # a run that leaves the grid must do so through a gate
        on = [c for c in v["cycle"] if c is not None]
        if len(on) != len(v["cycle"]):
            for edge in (on[0], on[-1]):
                if edge not in gates:
                    raise ValueError(
                        f"traffic[{i}] enters/leaves the site at {edge}, "
                        f"which is not a gate '='")

    # ---- two vehicles must never share a cell ----
    for p in range(limit):
        seen = {}
        for i, v in enumerate(vehicles):
            cell = vpos(v, p)
            if cell is None:
                continue
            if cell in seen:
                raise ValueError(
                    f"traffic[{seen[cell]}] and traffic[{i}] collide at "
                    f"{cell} on turn {p}")
            seen[cell] = i
    return lv


def next_phase(lv, p):
    p += 1
    if p < lv["limit"]:
        return p
    return lv["t_sat"] + (p - lv["t_sat"]) % lv["period"]


# --------------------------------------------------------------------------
# rules — mirrors step() in index.html
# --------------------------------------------------------------------------
def veh_at(lv, phase, cell):
    return any(vpos(v, phase) == cell for v in lv["vehicles"])


def succ(lv, state):
    """Yield (move, next_state, is_win). Fatal moves are simply not yielded."""
    for mv, nxt, kind in moves_detail(lv, state):
        if kind == "fatal":
            continue
        yield mv, nxt, kind == "win"


def moves_detail(lv, state):
    """Every legal move and what it does: 'ok', 'win' or 'fatal'.

    succ() filters this. Kept separate so tools/analyze.py can count the moves
    that end a run, which succ() deliberately hides.
    """
    dozer, piles, filled, phase = state
    for mv in range(5):
        npiles, nfilled = piles, filled
        if mv == WAIT:
            ndozer = dozer
        else:
            dr, dc = DIRS[mv]
            nr, nc = dozer[0] + dr, dozer[1] + dc
            if not (0 <= nr < lv["h"] and 0 <= nc < lv["w"]):
                continue
            if (nr, nc) in lv["walls"] or (nr, nc) in lv["gates"]:
                continue
            if veh_at(lv, phase, (nr, nc)):
                continue
            if (nr, nc) in piles:
                br, bc = nr + dr, nc + dc
                if not (0 <= br < lv["h"] and 0 <= bc < lv["w"]):
                    continue
                if (br, bc) in lv["walls"] or (br, bc) in lv["gates"]:
                    continue
                if (br, bc) in piles or veh_at(lv, phase, (br, bc)):
                    continue
                if (br, bc) in lv["marsh"]:
                    npiles = piles - {(nr, nc)}                    # swallowed
                elif (br, bc) in lv["holes"] and (br, bc) not in filled:
                    npiles = piles - {(nr, nc)}
                    nfilled = filled | {(br, bc)}
                else:
                    npiles = (piles - {(nr, nc)}) | {(br, bc)}
            elif (nr, nc) in lv["holes"] and (nr, nc) not in filled:
                continue
            ndozer = (nr, nc)
            if (nr, nc) in lv["marsh"]:                   # drives in, and sinks
                yield mv, (ndozer, npiles, nfilled,
                           next_phase(lv, phase)), "fatal"
                continue

        nphase = next_phase(lv, phase)

        if lv["holes"] <= nfilled:            # site finished before traffic moves
            yield mv, (ndozer, npiles, nfilled, nphase), "win"
            continue

        fatal = False
        for v in lv["vehicles"]:
            before, after = vpos(v, phase), vpos(v, nphase)
            if after is None:
                continue
            if after == ndozer:
                fatal = True; break
            if before == ndozer and after == dozer:
                fatal = True; break
            if after in npiles:
                fatal = True; break
        yield mv, (ndozer, npiles, nfilled, nphase), "fatal" if fatal else "ok"


def dead(lv, s):
    return len(s[1]) < len(lv["holes"] - s[2])


def rebuild(parent, s):
    out = []
    while parent[s][0] is not None:
        prev, mv = parent[s]
        out.append(LETTER[mv])
        s = prev
    return "".join(reversed(out))


def bfs(lv, cap=4_000_000):
    """Shortest solution, or (None, False) if the search cap was hit."""
    start = (lv["dozer"], lv["piles"], frozenset(), 0)
    parent = {start: (None, None)}
    q = deque([start])
    while q:
        s = q.popleft()
        for mv, nxt, win in succ(lv, s):
            if nxt in parent:
                continue
            parent[nxt] = (s, mv)
            if win:
                return rebuild(parent, nxt), True
            if dead(lv, nxt):
                continue
            q.append(nxt)
        if len(parent) > cap:
            return None, False
    return None, True                        # exhausted -> provably unsolvable


# --------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--paths", action="store_true")
    ap.add_argument("--json", metavar="FILE")
    ap.add_argument("--emit", action="store_true",
                    help="print the SOLUTIONS array to paste into index.html")
    ap.add_argument("--diff", choices=DIFF_ORDER, default=None,
                    help="only check one shift (default: all three)")
    args = ap.parse_args()

    shifts = [args.diff] if args.diff else DIFF_ORDER
    levels = read_levels()
    bad, sols = [], []
    print(f"{len(levels)} levels from {HTML.name}")
    print(f"shifts checked: {', '.join(shifts)}   (par measured on {PAR_DIFF})\n")

    for i, level in enumerate(levels, 1):
        name, par = level["name"], level["par"]
        results, broke = {}, False
        for d in shifts:
            try:
                lv = parse(level, d)
            except ValueError as e:
                print(f"  FAIL  {i:2d} {name:16s} [{d}] malformed: {e}")
                bad.append(f"{name}/{d}")
                broke = True
                break
            path, exhaustive = bfs(lv)
            if path is None:
                verdict = "UNSOLVABLE" if exhaustive else "search cap hit"
                print(f"  FAIL  {i:2d} {name:16s} [{d}] {verdict}")
                bad.append(f"{name}/{d}")
                broke = True
                break
            results[d] = (path, lv)
        if broke:
            sols.append(None)
            continue

        ref = PAR_DIFF if PAR_DIFF in results else shifts[0]
        path, lv = results[ref]
        n = len(path)
        note = ""
        if n != par:
            note = f"   <-- par should be {n}, file says {par}"
            bad.append(name)

        extra = ""
        if lv["vehicles"]:
            extra += f" traffic={len(lv['vehicles'])}"
        if lv["gates"]:
            extra += f" gates={len(lv['gates'])}"
        if lv["marsh"]:
            extra += f" soft={len(lv['marsh'])}"
        if level.get("escalate"):
            extra += " escalating"
        spread = "/".join(str(len(results[d][0])) for d in shifts)
        print(f"  ok    {i:2d} {name:16s} dirt={len(lv['piles'])} "
              f"holes={len(lv['holes'])} par={n}{extra}  [{spread}]{note}")
        if args.paths:
            for d in shifts:
                print(f"        {d:10s} {results[d][0]}")
        sols.append(path)

    if args.json:
        Path(args.json).write_text(json.dumps(sols), encoding="utf-8")
        print(f"\nwrote {args.json}")

    if args.emit:
        if any(s is None for s in sols):
            print("\ncannot emit: some levels have no solution")
        else:
            body, line = [], "  "
            for s in sols:
                piece = f'"{s}",'
                if len(line) + len(piece) > 76:
                    body.append(line.rstrip())
                    line = "  "
                line += piece
            body.append(line.rstrip().rstrip(","))
            print("\nconst SOLUTIONS=[\n" + "\n".join(body) + "\n];")

    if bad:
        print(f"\n{len(bad)} problem(s): {', '.join(bad)}")
        return 1
    print(f"\nall levels solvable on all {len(shifts)} shift(s), all pars correct")
    print("[a/b/c] = optimal moves on " + "/".join(shifts))
    return 0


if __name__ == "__main__":
    sys.exit(main())

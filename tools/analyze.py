"""Measure how hard each Cut & Fill level actually is.

    py -3 tools/analyze.py
    py -3 tools/analyze.py --cap 800000 --diff foreman

Par tells you how *long* a level is, which is not the same as how hard it is.
This measures two things par cannot see.

Trap density
    The share of reachable positions from which the site can no longer be
    finished. This is the "I ruined it twenty moves ago and didn't notice"
    axis. Computed exactly: enumerate every reachable position, mark the ones
    with a winning move, then propagate that backwards through the move graph
    to a fixed point. Whatever is left cannot reach a win.

Lethality
    The share of available moves that end the run outright — sinking, being
    run over, or wrecking a truck on dirt left in a lane. This is the "one
    wrong keystroke and it's over" axis, and it is invisible to trap density
    because a fatal move never becomes a reachable position.

Both are shares of the *reachable* space, so they are comparable across levels
of different sizes. Levels too large to enumerate are reported as truncated
rather than guessed at.
"""

import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import validate as V                                   # noqa: E402


def analyze(lv, cap, budget):
    """Enumerate the reachable space, then find which of it can still be won.

    Storing every edge for the backward pass costs more memory than the state
    set itself, so successors are regenerated instead and the winnable set is
    swept to a fixed point. Sweeping newest-first converges in a few passes,
    because a winning move is usually deep in the graph.

    A truncated enumeration cannot answer the trap question at all: states we
    never expanded have no recorded successors, so they masquerade as dead
    ends and drive the figure towards 100%. Those levels report None rather
    than a number that looks meaningful and isn't.
    """
    start = (lv["dozer"], lv["piles"], frozenset(), 0)
    index = {start: 0}
    order = [start]
    has_win = bytearray()
    fatal_moves = total_moves = 0
    truncated = False
    t0 = time.time()

    head = 0
    while head < len(order):
        if len(order) > cap or time.time() - t0 > budget:
            truncated = True
            break
        u = order[head]
        head += 1
        w = 0
        for mv, nxt, kind in V.moves_detail(lv, u):
            total_moves += 1
            if kind == "fatal":
                fatal_moves += 1
                continue
            if kind == "win":
                w = 1
                continue
            if nxt not in index:
                index[nxt] = len(order)
                order.append(nxt)
        has_win.append(w)          # ids are handed out in expansion order

    lethality = fatal_moves / total_moves if total_moves else 0.0
    if truncated:
        return dict(states=len(order), truncated=True, trap=None,
                    lethality=lethality, passes=0)

    n = len(order)
    winnable = bytearray(has_win)
    passes = 0
    changed = True
    while changed:
        changed = False
        passes += 1
        for uid in range(n - 1, -1, -1):
            if winnable[uid]:
                continue
            for mv, nxt, kind in V.moves_detail(lv, order[uid]):
                if kind != "ok":
                    continue
                vid = index.get(nxt)
                if vid is not None and winnable[vid]:
                    winnable[uid] = 1
                    changed = True
                    break

    return dict(states=n, truncated=False,
                trap=(n - sum(winnable)) / n if n else 0.0,
                lethality=lethality, passes=passes)


def bar(frac, width=18):
    filled = int(round(frac * width))
    return "#" * filled + "." * (width - filled)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cap", type=int, default=6_000_000,
                    help="max positions to enumerate per level")
    ap.add_argument("--budget", type=float, default=90.0,
                    help="seconds to spend enumerating one level")
    ap.add_argument("--diff", choices=V.DIFF_ORDER, default=V.PAR_DIFF)
    ap.add_argument("--by", choices=["order", "trap", "lethality", "par"],
                    default="order", help="sort the summary")
    ap.add_argument("--levels", help="1-based list, e.g. 8,10,12")
    args = ap.parse_args()

    levels = V.read_levels()
    pick = None
    if args.levels:
        pick = {int(x) for x in args.levels.replace(" ", "").split(",")}

    rows = []
    print(f"Measuring on the {args.diff} shift "
          f"(cap {args.cap:,} positions, {args.budget:g}s each)\n")
    print(f"{'#':>3} {'level':<17}{'par':>4}{'states':>11}  "
          f"{'trap':>6} {'lethal':>7}   profile")
    print("-" * 76)

    for i, level in enumerate(levels, 1):
        if pick and i not in pick:
            continue
        lv = V.parse(level, args.diff)
        t0 = time.time()
        r = analyze(lv, args.cap, args.budget)
        r["secs"] = time.time() - t0
        rows.append((i, level["name"], level["par"], r))
        if r["trap"] is None:
            print(f"{i:>3} {level['name']:<17}{level['par']:>4}"
                  f"{r['states']:>11,}  {'--':>5}  {r['lethality']*100:>6.1f}%"
                  f"   too large to enumerate")
        else:
            print(f"{i:>3} {level['name']:<17}{level['par']:>4}"
                  f"{r['states']:>11,}  {r['trap']*100:>5.1f}% "
                  f"{r['lethality']*100:>6.1f}%   {bar(r['trap'])}")
        sys.stdout.flush()

    print("\nTrap density = share of reachable positions that can no longer be won")
    print("               (exact: every position enumerated, then swept to a")
    print("               fixed point). Blank means the space was too large —")
    print("               a truncated sweep reports near-100% as an artefact,")
    print("               so no number is given rather than a misleading one.")
    print("Lethality    = share of available moves that end the run outright.")

    ranked = [r for r in rows if r[3]["trap"] is not None]
    if ranked and args.by != "order":
        key = {"trap": lambda x: -x[3]["trap"],
               "lethality": lambda x: -x[3]["lethality"],
               "par": lambda x: -x[2]}[args.by]
        print(f"\nRanked by {args.by}:")
        for i, name, par, r in sorted(ranked, key=key):
            print(f"  {i:>3} {name:<17} par {par:>3}   "
                  f"trap {r['trap']*100:>5.1f}%   lethal {r['lethality']*100:>5.1f}%")
    return 0


if __name__ == "__main__":
    sys.exit(main())

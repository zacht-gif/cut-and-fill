"""Full regression suite for Cut & Fill.

    py -3 tools/test.py            # both halves
    py -3 tools/test.py --py-only  # skip the JavaScript half

Exits non-zero on any failure, so it can gate a commit.

Two engines, one contract
-------------------------
The rules exist twice on purpose: once in `index.html` for the game, once in
`tools/validate.py` for authoring. That redundancy is only worth anything if
something checks the two against each other, which is what this does.

The Python half (here) checks:
  * every level parses and is solvable on all three shifts
  * every declared `par` is the true optimum on the Operator shift
  * every reference solution replays through the Python rules to a win, on
    exactly par, with no illegal move
  * data integrity: unique names, one solution per level

The JavaScript half (`tools/test.mjs`, run automatically when node is
available) boots the real page against a stub DOM and runs the selfTest()
defined inside index.html: the same solutions replayed through the game's own
step(), the in-page solver against the recorded pars, the three fatal
outcomes, undo, star thresholds, picker reuse and the site generator.

Both halves read the SOLUTIONS array out of index.html, so there is a single
source of truth. If the engines ever drift apart, one of the two fails.
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import validate as V                                   # noqa: E402

LETTER_TO_MOVE = {"U": 0, "R": 1, "D": 2, "L": 3, ".": V.WAIT}


def read_solutions(path=V.HTML):
    src = path.read_text(encoding="utf-8")
    m = re.search(r"const SOLUTIONS\s*=\s*\[(.*?)\];", src, re.S)
    if not m:
        raise SystemExit("could not find the SOLUTIONS array in index.html")
    return re.findall(r'"([^"]*)"', m.group(1))


def replay(lv, moves):
    """Walk a solution through the rules engine. Returns (won, error)."""
    state = (lv["dozer"], lv["piles"], frozenset(), 0)
    for i, ch in enumerate(moves, 1):
        if ch not in LETTER_TO_MOVE:
            return False, f"move {i}: unknown character {ch!r}"
        want = LETTER_TO_MOVE[ch]
        nxt = [(s, win) for mv, s, win in V.succ(lv, state) if mv == want]
        if not nxt:
            return False, f"move {i} ({ch}) is illegal or fatal here"
        state, win = nxt[0]
        if win:
            if i != len(moves):
                return False, f"finished early, at move {i} of {len(moves)}"
            return True, None
    return False, "ran out of moves without finishing the site"


class Suite:
    def __init__(self):
        self.results = []

    def check(self, name, passed, detail=""):
        self.results.append((name, bool(passed), detail))
        return passed

    def report(self):
        fails = [r for r in self.results if not r[1]]
        for name, passed, detail in self.results:
            print(f"  {'PASS' if passed else 'FAIL'}  {name}")
            if detail:
                print(f"        {detail}")
        print()
        if fails:
            print(f"FAIL — {len(fails)} of {len(self.results)} checks")
            return 1
        print(f"PASS — all {len(self.results)} checks")
        return 0


def find_node():
    """node, even when a fresh install has not reached this shell's PATH."""
    exe = shutil.which("node")
    if exe:
        return exe
    for base in (os.environ.get("ProgramFiles"),
                 os.environ.get("ProgramFiles(x86)"),
                 os.environ.get("LOCALAPPDATA")):
        if not base:
            continue
        for rel in ("nodejs/node.exe", "Programs/nodejs/node.exe"):
            p = Path(base) / rel
            if p.exists():
                return str(p)
    return None


def run_js_half():
    """Returns (ran, exit_code)."""
    node = find_node()
    runner = Path(__file__).resolve().parent / "test.mjs"
    if not node or not runner.exists():
        return False, 0
    print("=" * 62)
    sys.stdout.flush()          # or the child's output races ahead of ours
    proc = subprocess.run([node, str(runner)], cwd=str(runner.parent.parent))
    sys.stdout.flush()
    return True, proc.returncode


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--py-only", action="store_true",
                    help="skip the JavaScript half even if node is present")
    args = ap.parse_args()

    s = Suite()
    levels = V.read_levels()
    solutions = read_solutions()

    print(f"Cut & Fill — rules engine suite ({len(levels)} levels)\n")

    # ---- data integrity -------------------------------------------------
    s.check("one reference solution per level",
            len(levels) == len(solutions),
            f"{len(levels)} levels, {len(solutions)} solutions")
    names = [lv["name"] for lv in levels]
    dupes = {n for n in names if names.count(n) > 1}
    s.check("level names are unique", not dupes, ", ".join(sorted(dupes)))

    # ---- parse + solve on every shift -----------------------------------
    malformed, unsolvable, wrong_par = [], [], []
    for i, level in enumerate(levels):
        for diff in V.DIFF_ORDER:
            try:
                lv = V.parse(level, diff)
            except ValueError as e:
                malformed.append(f"{level['name']}/{diff}: {e}")
                continue
            path, exhaustive = V.bfs(lv)
            if path is None:
                unsolvable.append(f"{level['name']}/{diff}"
                                  + ("" if exhaustive else " (search cap)"))
                continue
            if diff == V.PAR_DIFF and len(path) != level["par"]:
                wrong_par.append(
                    f"{level['name']}: par says {level['par']}, optimum is {len(path)}")

    s.check("every level parses on every shift", not malformed, "; ".join(malformed))
    s.check("every level is solvable on every shift", not unsolvable,
            "; ".join(unsolvable))
    s.check("every declared par is the true optimum", not wrong_par,
            "; ".join(wrong_par))

    # ---- reference solutions replay -------------------------------------
    replay_fails = []
    for i, level in enumerate(levels):
        if i >= len(solutions):
            break
        lv = V.parse(level, V.PAR_DIFF)
        won, err = replay(lv, solutions[i])
        if not won:
            replay_fails.append(f"{i+1} {level['name']}: {err}")
        elif len(solutions[i]) != level["par"]:
            replay_fails.append(
                f"{i+1} {level['name']}: solution is {len(solutions[i])} moves, "
                f"par is {level['par']}")
    s.check("every reference solution replays to a win at par",
            not replay_fails, "; ".join(replay_fails))

    py_code = s.report()

    if args.py_only:
        return py_code

    ran, js_code = run_js_half()
    if not ran:
        print("\nnote: node not found — the JavaScript half was skipped.")
        print("      Install node, or open index.html?test=1 in a browser.")
        return py_code

    both = py_code or js_code
    print("=" * 62)
    print("OVERALL: " + ("FAIL" if both else "PASS — both engines agree"))
    return both


if __name__ == "__main__":
    sys.exit(main())

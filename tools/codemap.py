"""Generate CODE-MAP.md - a line-numbered index of index.html.

The whole game is one 3,400-line document: stylesheet, markup, rules engine,
solver, editor and self test in the same file, on purpose. That is a good way
to ship it and a slow way to edit it - every change starts by grepping around
to find out where the thing actually lives, and a wrong guess costs a read of
a few hundred lines that turn out to be the editor.

This writes that search down once, so the loop becomes:

    grep -n fitCell CODE-MAP.md      -> index.html 2135-2185
    sed -n '2135,2185p' index.html   -> read only that

    py -3 tools/codemap.py           # rewrite CODE-MAP.md
    py -3 tools/codemap.py --check   # fail if it is out of date

Generated, not written, because every line number below a change moves when
the change lands. A map nobody regenerates is worse than no map at all: it
points somewhere plausible, and plausible is exactly what gets believed. That
is why tools/test.py runs the check - the same reason dev-status reports a
STALE BUILD rather than trusting that a build happened.
"""

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HTML = ROOT / "index.html"
OUT = ROOT / "CODE-MAP.md"


# ---------------------------------------------------------------- helpers

def find(lines, needle, start=0):
    """1-based line number of the first line that is exactly `needle`."""
    for i in range(start, len(lines)):
        if lines[i].strip() == needle:
            return i + 1
    raise SystemExit("codemap: could not find %r in index.html" % needle)


def blank_comments(text):
    """Replace /* ... */ with spaces, keeping newlines so lines still count."""
    out, i, n = [], 0, len(text)
    while i < n:
        if text.startswith("/*", i):
            j = text.find("*/", i + 2)
            j = n if j < 0 else j + 2
            out.append("".join("\n" if c == "\n" else " " for c in text[i:j]))
            i = j
        else:
            out.append(text[i])
            i += 1
    return "".join(out)


# -------------------------------------------------------------------- CSS

def css_rules(text, base_line):
    """Every selector in the stylesheet, as (line, depth, selector).

    A brace counter rather than a line regex, because the rules are written
    both ways: most at column zero, the ones inside @media indented, and at
    least one whole media query on a single line. Depth is what separates a
    top-level rule from one that only applies inside a query, and the two
    want to read differently in the map.
    """
    t = blank_comments(text)
    rules, stack, depth, seg = [], [], 0, 0
    for i, ch in enumerate(t):
        if ch == "{":
            raw = t[seg:i]
            sel = " ".join(raw.split())
            in_keyframes = bool(stack) and stack[-1].startswith("@keyframes")
            if sel and depth <= 1 and not in_keyframes:
                off = seg + (len(raw) - len(raw.lstrip()))
                rules.append((base_line + t.count("\n", 0, off), depth, sel))
            stack.append(sel)
            depth += 1
            seg = i + 1
        elif ch == "}":
            if stack:
                stack.pop()
            depth -= 1
            seg = i + 1
        elif ch == ";" and depth == 0:
            seg = i + 1          # @charset / @import, no block of its own
    return rules


def palette(text):
    """The custom properties declared on :root, in source order."""
    m = re.search(r":root\s*\{(.*?)\}", text, re.S)
    if not m:
        return []
    return re.findall(r"(--[\w-]+)\s*:\s*([^;]+);", m.group(1))


# ------------------------------------------------------------------- HTML

def html_ids(lines, lo, hi):
    """(line, tag, id) for every id in the markup, in document order."""
    found = []
    pat = re.compile(r'<([a-z][a-z0-9]*)\b[^>]*?\bid="([A-Za-z0-9_-]+)"')
    for n in range(lo, hi + 1):
        for tag, ident in pat.findall(lines[n - 1]):
            found.append((n, tag, ident))
    return found


# --------------------------------------------------------------------- JS

# `$` is a legal identifier character and the file's busiest name is
# `const $=s=>document.querySelector(s)`. A plain \w+ silently skipped it.
IDENT = r"[A-Za-z_$][\w$]*"
DECL = re.compile(
    r"^(?:(async\s+)?function\s*(\*?)\s*(%s)|(const|let|var)\s+(%s))"
    % (IDENT, IDENT))
BANNER_RULE = re.compile(r"^/\*\s*=+\s*$")
BANNER_DASH = re.compile(r"^/\*\s*-{2,}\s*(.+?)\s*-{2,}\s*(?:\*/)?\s*$")
WIRE_PROP = re.compile(r'^\$\("#(\w+)"\)\.(on\w+)')
WIRE_LISTEN = re.compile(r'^(?:document\.|window\.)?addEventListener\("(\w+)"')
WIRE_QSA = re.compile(r"^document\.querySelectorAll\((.+?)\)\.forEach")


def balanced_end(lines, start, cap=500):
    """Last line of the construct beginning at `start`, or None if unclear.

    Counts brackets from the opening line until they settle back to zero.
    Strings are not parsed, so a brace inside a quoted string would throw the
    count off - the cap is the guard against that turning into a wild range,
    and the caller falls back to the next declaration instead.
    """
    depth = 0
    for n in range(start, min(start + cap, len(lines)) + 1):
        line = re.sub(r"//.*$", "", lines[n - 1])
        for ch in line:
            if ch in "{[(":
                depth += 1
            elif ch in "}])":
                depth -= 1
        if depth <= 0:
            return n
    return None


def js_index(lines, lo, hi):
    """Chapters, declarations and event wiring in the script block."""
    chapters, decls, wiring = [], [], []
    for n in range(lo, hi + 1):
        line = lines[n - 1]
        if BANNER_RULE.match(line):
            title = lines[n].strip() if n < len(lines) else ""
            if title and not title.startswith("="):
                chapters.append((n, title))
            continue
        m = BANNER_DASH.match(line)
        if m:
            chapters.append((n, m.group(1)))
            continue
        m = DECL.match(line)
        if m:
            name = m.group(3) or m.group(5)
            if m.group(3):
                kind = ("function*" if m.group(2)
                        else "async fn" if m.group(1) else "function")
            else:
                kind = m.group(4)
            decls.append([n, kind, name, None])
            continue
        m = WIRE_PROP.match(line)
        if m:
            wiring.append((n, "#" + m.group(1), m.group(2)))
            continue
        m = WIRE_LISTEN.match(line)
        if m:
            wiring.append((n, "(page)", m.group(1)))
            continue
        m = WIRE_QSA.match(line)
        if m:
            wiring.append((n, m.group(1).strip("\"'"), "forEach"))

    # End lines: the bracket count where it settles, the next declaration
    # where it does not. Only declarations bound the fallback - a banner
    # cannot, because some of them sit *inside* a declaration. The dividers
    # between the game's three chapters live in the middle of the LEVELS
    # array, and counting those as boundaries cut LEVELS off at 1001 when it
    # runs to 1137 - a wrong range that looks entirely reasonable, which is
    # the exact failure this file exists to prevent.
    starts = sorted([d[0] for d in decls] + [hi + 1])
    for d in decls:
        nxt = next(s for s in starts if s > d[0])
        end = balanced_end(lines, d[0])
        d[3] = end if end is not None and end < nxt else nxt - 1

    # A banner inside a declaration is a divider within it, not a section of
    # the script. Worth keeping - it is how you find where chapter two of the
    # campaign begins - but it has to read as nested or it implies the
    # enclosing declaration ended there.
    spans = [(d[0], d[3], d[2]) for d in decls]
    marked = []
    for n, title in chapters:
        owner = next((nm for a, b, nm in spans if a < n <= b), None)
        marked.append((n, title, owner))
    return marked, decls, wiring


# ------------------------------------------------------------------ tools

# Column zero only: these are module-level names, the ones another file can
# reach for. Module constants count - test.py calls V.WAIT and V.PAR_DIFF as
# readily as it calls V.parse.
TOOL_PY = re.compile(r"^(?:def|class)\s+(\w+)|^([A-Z][A-Z0-9_]*)\s*=")
TOOL_JS = re.compile(
    r"^(?:export\s+)?(?:default\s+)?(?:async\s+)?"
    r"(?:function\s*\*?\s*(%s)|class\s+(%s)|(?:const|let|var)\s+(%s))"
    % (IDENT, IDENT, IDENT))


def tool_index():
    rows = []
    for path in sorted((ROOT / "tools").rglob("*")):
        if path.suffix not in (".py", ".mjs") or "__pycache__" in path.parts:
            continue
        lines = path.read_text(encoding="utf-8").splitlines()
        pat = TOOL_PY if path.suffix == ".py" else TOOL_JS
        names = []
        for n, line in enumerate(lines, 1):
            m = pat.match(line)
            if m:
                hit = next(g for g in m.groups() if g)
                names.append("%s:%d" % (hit, n))
        rows.append((path.relative_to(ROOT).as_posix(), len(lines), names))
    return rows


# ----------------------------------------------------------------- render

def build():
    src = HTML.read_text(encoding="utf-8")
    lines = src.splitlines()
    total = len(lines)

    style_a = find(lines, "<style>")
    style_b = find(lines, "</style>", style_a)
    body_a = find(lines, "<body>", style_b)
    script_a = find(lines, "<script>", body_a)
    script_b = find(lines, "</script>", script_a)

    css_text = "\n".join(lines[style_a:style_b - 1])
    rules = css_rules(css_text, style_a + 1)
    vars_ = palette(css_text)
    ids = html_ids(lines, body_a + 1, script_a - 1)
    chapters, decls, wiring = js_index(lines, script_a + 1, script_b - 1)

    o = []
    w = o.append
    w("<!-- Generated by tools/codemap.py. Do not hand-edit: every line number")
    w("     below moves when index.html does, and the generator is the only")
    w("     thing that keeps them honest.")
    w("")
    w("       py -3 tools/codemap.py           rewrite this file")
    w("       py -3 tools/codemap.py --check   fail if it is stale")
    w("")
    w("     tools/test.py runs the check, so a stale map fails the suite. -->")
    w("")
    w("# Code map - `index.html`")
    w("")
    w("%s lines, %s bytes. One file: stylesheet, markup, rules, solver,"
      % (format(total, ","), format(len(src), ",")))
    w("editor and self test. There is no build step, so this *is* the source.")
    w("")
    w("**Use it like this** - find the thing, then read only its slice:")
    w("")
    w("```bash")
    w("grep -n fitCell CODE-MAP.md      # -> 2135-2185")
    w("sed -n '2135,2185p' index.html   # read those 51 lines, not 3,472")
    w("```")
    w("")
    w("Ranges are inclusive. One that ends at the next declaration rather than")
    w("a matched brace is still a safe slice to *read* - never a safe slice to")
    w("overwrite. Edit by anchored replacement, not by line number.")
    w("")
    w("## Regions")
    w("")
    w("| lines | what |")
    w("|---|---|")
    w("| 1-%d | `<head>`: meta, title, inline favicon |" % (style_a - 1))
    w("| %d-%d | `<style>` - %d rules |" % (style_a, style_b, len(rules)))
    w("| %d-%d | `<body>` markup - %d ids |"
      % (body_a, script_a - 1, len(ids)))
    w("| %d-%d | `<script>` - %d declarations |"
      % (script_a, script_b, len(decls)))
    w("| %d-%d | close |" % (script_b + 1, total))
    w("")

    w("## Chapters")
    w("")
    w("The script's own banner comments, in order. This is the coarse map;")
    w("everything under them is listed in full further down.")
    w("")
    w("| lines | chapter |")
    w("|---|---|")
    tops = [c[0] for c in chapters if c[2] is None] + [script_b]
    for n, title, owner in chapters:
        if owner is None:
            end = next(t for t in tops if t > n) - 1
            w("| %d-%d | %s |" % (n, end, title))
        else:
            w("| %d | &nbsp;&nbsp;&nbsp;&nbsp;%s &nbsp;_(inside `%s`)_ |"
              % (n, title, owner))
    w("")

    w("## Stylesheet")
    w("")
    w("Custom properties on `:root` (%d):" % (style_a + 1))
    w("")
    w("| name | value |")
    w("|---|---|")
    for name, val in vars_:
        w("| `%s` | `%s` |" % (name, val.strip()))
    w("")
    w("Selectors, in source order. An indented row sits inside the media query")
    w("above it and applies only under that query.")
    w("")
    w("| line | selector |")
    w("|---|---|")
    for n, depth, sel in rules:
        pad = "&nbsp;&nbsp;&nbsp;&nbsp;" if depth else ""
        w("| %d | %s`%s` |" % (n, pad, sel))
    w("")

    w("## Markup ids")
    w("")
    w("| line | element |")
    w("|---|---|")
    for n, tag, ident in ids:
        w("| %d | `#%s` &nbsp;`<%s>` |" % (n, ident, tag))
    w("")

    w("## Script declarations")
    w("")
    w("| lines | kind | name |")
    w("|---|---|---|")
    for n, kind, name, end in decls:
        span = str(n) if end == n else "%d-%d" % (n, end)
        w("| %s | %s | `%s` |" % (span, kind, name))
    w("")

    w("## Event wiring")
    w("")
    w("Where a control is bound to its behaviour - the answer to \"I clicked")
    w("this, what ran?\" without reading the whole script.")
    w("")
    w("| line | target | event |")
    w("|---|---|---|")
    for n, target, ev in wiring:
        w("| %d | `%s` | `%s` |" % (n, target, ev))
    w("")

    w("## tools/")
    w("")
    for rel, count, names in tool_index():
        w("**`%s`** - %d lines  " % (rel, count))
        w("  " + (", ".join("`%s`" % x for x in names) if names else "_(script)_"))
        w("")
    return "\n".join(o) + "\n"


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--check", action="store_true",
                    help="exit non-zero if CODE-MAP.md is out of date")
    args = ap.parse_args()

    text = build()
    if args.check:
        # Compare line by line, not byte for byte: core.autocrlf rewrites the
        # working copy to CRLF on checkout, and that is not staleness.
        have = (OUT.read_text(encoding="utf-8").splitlines()
                if OUT.exists() else None)
        if have == text.splitlines():
            return 0
        print("CODE-MAP.md is out of date - run:  py -3 tools/codemap.py")
        return 1
    OUT.write_text(text, encoding="utf-8", newline="\n")
    print("%s  %s lines indexing %s"
          % (OUT.relative_to(ROOT).as_posix(),
             format(len(text.splitlines()), ","), HTML.name))
    return 0


if __name__ == "__main__":
    sys.exit(main())

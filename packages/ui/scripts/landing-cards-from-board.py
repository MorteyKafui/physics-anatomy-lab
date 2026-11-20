"""Draw the landing page's four experiment-card stages from the approved board.

Run from the repository root, then format:
    python -I packages/ui/scripts/landing-cards-from-board.py design/mockups/Main.dc.html packages/ui/src/illustrations/landing-cards.tsx
    bunx prettier --write packages/ui/src/illustrations/landing-cards.tsx
"""
import re, sys
src = open(sys.argv[1], encoding="utf8").read()
sec = src[src.index('<section id="experiments"'):src.index('<!-- BENTO -->')]
svgs = re.findall(r'<svg viewBox="0 0 300 228"[^>]*>(.*?)</svg>', sec, re.S)
assert len(svgs) == 4, len(svgs)

def camel(a):
    if a.startswith(("data-", "aria-")): return a
    if a == "class": return "className"
    if a == "xlink:href": return "href"
    p = a.split("-"); return p[0] + "".join(x.title() for x in p[1:])

def style_obj(s):
    out = []
    for decl in s.split(";"):
        if ":" not in decl: continue
        k, v = decl.split(":", 1); k = k.strip(); v = v.strip()
        k = re.sub(r"-([a-z])", lambda m: m.group(1).upper(), k)
        out.append(f'{k}: "{v}"')
    return "{{ " + ", ".join(out) + " }}"

def dedupe_tags(markup):
    """A browser keeps the first of two attributes with the same name; so does this."""
    def one(m):
        tag, rest, end = m.group(1), m.group(2), m.group(3)
        seen, kept = set(), []
        for name, val in re.findall(r'([\w:-]+)="([^"]*)"', rest):
            if name not in seen:
                seen.add(name); kept.append(f'{name}="{val}"')
        return "<" + tag + (" " + " ".join(kept) if kept else "") + end
    return re.sub(r"<(\w+)((?:\s+[\w:-]+=\"[^\"]*\")*)\s*(/?>)", one, markup)

def jsx(markup):
    markup = dedupe_tags(markup)
    markup = re.sub(r'\s*onMouseLeave="\{\{tipOff\}\}"', "", markup)
    markup = re.sub(r'onMouseEnter="\{\{tips\.\w+\.(\w+)\}\}"', r'data-tip="\1"', markup)
    def attr(m):
        name, val = m.group(1), m.group(2)
        if name == "style": return f"style={style_obj(val)}"
        return f'{camel(name)}="{val}"'
    markup = re.sub(r'([a-zA-Z:-]+)="([^"]*)"', attr, markup)
    markup = re.sub(r"<(\w+)([^<>]*?)></\1>", r"<\1\2 />", markup)
    return markup.replace(' className=""', "").strip()

c1 = svgs[0]
c1 = re.sub(r'<g class="pa-barg".*?</g>\s*', "", c1, flags=re.S)
c1 = re.sub(r'<polyline points="\{\{b1\.line\}\}"[^>]*></polyline>\s*', "", c1)
assert "{{" not in c1, re.findall(r"\{\{[^}]*\}\}", c1)[:3]
out = ['// Generated from design/mockups/Main.dc.html by scripts/landing-cards-from-board.py; the',
       '// approved board is the source, so do not edit by hand. Each experiment card\'s isometric stage, without its',
       '// live parts: the app draws the pendulum card\'s bars, and each part a note can point at',
       '// carries data-tip.', '', 'import type { ReactNode } from "react";', '']
names = ["PendulumStage", "CircuitStage", "LensStage", "MixturesStage"]
for i, (n, body) in enumerate(zip(names, [c1] + svgs[1:])):
    j = jsx(body)
    assert not re.search(r"\{\{[a-zA-Z]", j), (n, re.findall(r"\{\{[a-zA-Z][^}]*\}\}", j)[:3])
    if i == 0:
        out.append(f"/** The stacked plates the pendulum card's bars stand on; `children` is drawn on top. */")
        out.append(f"export function {n}({{ children }}: {{ children?: ReactNode }}) {{\n  return (\n    <>\n      {j}\n      {{children}}\n    </>\n  );\n}}\n")
    else:
        out.append(f"export function {n}() {{\n  return (\n    <>\n      {j}\n    </>\n  );\n}}\n")
open(sys.argv[2], "w", encoding="utf8", newline="\n").write("\n".join(out))
print("ok", [len(s) for s in svgs])

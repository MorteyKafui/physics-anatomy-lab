"""The check that a reply's numbers come from the bench, not from the model (AGENTS.md rule 1).

A number in a reply is explained when it is one the context gave (a quantity, a number in an event
or the student's own words), written to the precision the reply uses, perhaps in another unit
(0.8 m as 80 cm); or a small whole number of plain counting (20 swings, step 5); or a number
the feature's instructions give (10° for the small-angle limit). Anything else is held.
"""

import re
from collections.abc import Iterable

# A plain number: 3, 0.80, 1.806, -2.5. Not a digit inside a word (t1) and not a superscript.
MINUS = "\u2212"  # the typeset minus sign, as replies may write it
_NUMBER = re.compile(r"(?<![\w.])[-\u2212]?\d+(?:\.\d+)?(?![\w])")
SMALL_WHOLE = 20
# A reply may give a value in another unit: kilo to milli.
_SCALES = (1e-3, 1e-2, 1e-1, 1.0, 1e1, 1e2, 1e3)


def numbers_in(text: str) -> list[float]:
    return [float(m.replace(MINUS, "-")) for m in _NUMBER.findall(text)]


def _decimals(written: str) -> int:
    return len(written.split(".", 1)[1]) if "." in written else 0


def unexplained(reply: str, seen: Iterable[float], allowed: Iterable[float] = ()) -> list[str]:
    """The numbers in `reply`, as written, that nothing in the context explains."""
    known = [*seen, *allowed]
    out: list[str] = []
    for written in _NUMBER.findall(reply):
        value = float(written.replace(MINUS, "-"))
        places = _decimals(written)
        if places == 0 and value.is_integer() and 0 <= abs(value) <= SMALL_WHOLE:
            continue
        if any(
            round(k * scale, places) == round(abs(value), places)
            for k in (abs(x) for x in known)
            for scale in _SCALES
        ):
            continue
        out.append(written)
    return out

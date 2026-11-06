"""Significant figures, written independently of packages/analysis with Python's decimal module.

The rules are the practical manual's: non-zero digits count; zeros between them count; trailing
zeros after a decimal point count; leading zeros do not. A whole number with trailing zeros and
no decimal point ("1200") is ambiguous, and its trailing zeros are not counted.
"""

from decimal import Decimal


def parse_figure(raw: str) -> dict[str, object]:
    text = raw.strip().replace(",", "")
    number = Decimal(text)
    digits = number.as_tuple().digits
    mantissa = text.lower().split("e")[0]
    has_point = "." in mantissa
    has_exponent = "e" in text.lower()
    decimals = len(mantissa.split(".")[1]) if has_point else 0

    ambiguous = False
    if all(d == 0 for d in digits):
        sig_figs = max(1, decimals)
    elif not has_point and not has_exponent and digits[-1] == 0 and len(digits) > 1:
        ambiguous = True
        stripped = list(digits)
        while stripped and stripped[-1] == 0:
            stripped.pop()
        sig_figs = len(stripped)
    else:
        sig_figs = len(digits)

    return {
        "value": float(number),
        "sigFigs": sig_figs,
        "decimals": decimals,
        "ambiguousTrailingZeros": ambiguous,
    }


def format_sig_figs(value: float, n: int) -> str:
    """Python's alternate-form g format keeps trailing zeros: 0.5 to 3 figures is "0.500"."""
    text = format(value, f"#.{n}g")
    return text.rstrip(".")

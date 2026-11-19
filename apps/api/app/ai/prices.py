"""Anthropic's published prices, in US dollars per million tokens, as of 2026-11-03.

Used only to log what each AI request cost (ADR 0043). Cache writes are 1.25 times the input
price (five-minute cache). A model missing here is logged with no cost, never a guessed one.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Price:
    input: float
    output: float
    cache_read: float

    @property
    def cache_write(self) -> float:
        return self.input * 1.25


PRICES: dict[str, Price] = {
    "claude-haiku-5-5": Price(input=0.10, output=0.50, cache_read=0.01),
    "claude-sonnet-5-5": Price(input=2.00, output=10.00, cache_read=0.10),
    "claude-opus-5-5": Price(input=4.00, output=20.00, cache_read=0.20),
}


def cost_microdollars(
    model: str, *, input_tokens: int, output_tokens: int, cache_read: int, cache_write: int
) -> int | None:
    """Millionths of a dollar, so a million tokens at $1 is 1,000,000."""
    price = PRICES.get(model)
    if price is None:
        return None
    return round(
        input_tokens * price.input
        + output_tokens * price.output
        + cache_read * price.cache_read
        + cache_write * price.cache_write
    )

"""What if: a question turned into a scenario the experiment's model supports (ai-tutor-brief.md,
decision 6; ADR 0043, the `item` event).

Claude answers with JSON (structured outputs), and this module checks it before anything reaches
the browser: only the changes the model supports, each within its limits, and every number in
its words one of the scenario's own or the bench's. The browser checks the scenario again
(`checkScenario` in packages/experiments) and runs the real model; Claude never predicts a
number. The limits mirror packages/experiments/src/pendulum-scenario-limits.json, and a test
fails if the two differ.
"""

import json
from dataclasses import dataclass
from typing import Any, cast

from app.ai.context import AiContext
from app.ai.numbers import unexplained


@dataclass(frozen=True)
class Range:
    min: float
    max: float


@dataclass(frozen=True)
class ScenarioSpec:
    experiment: str
    ranges: dict[str, Range]
    places: tuple[str, ...]


PENDULUM = ScenarioSpec(
    experiment="simple-pendulum",
    ranges={
        "length": Range(0.1, 2),
        "amplitudeDeg": Range(1, 60),
        "massG": Range(10, 200),
    },
    places=("earth", "moon", "mars", "jupiter"),
)

SPECS: dict[str, ScenarioSpec] = {PENDULUM.experiment: PENDULUM}

NOT_READY = "What if is not ready for this experiment yet."


def _nullable(schema: dict[str, Any]) -> dict[str, Any]:
    return {"anyOf": [schema, {"type": "null"}]}


def output_schema(spec: ScenarioSpec) -> dict[str, Any]:
    """What Claude must answer with. Every change is present, null when unchanged."""
    changes = {
        "type": "object",
        "properties": {
            **{name: _nullable({"type": "number"}) for name in spec.ranges},
            "place": _nullable({"type": "string", "enum": list(spec.places)}),
        },
        "required": [*spec.ranges, "place"],
        "additionalProperties": False,
    }
    return {
        "type": "object",
        "properties": {
            "kind": {"type": "string", "enum": ["scenario", "declined"]},
            "title": {"type": "string"},
            "reason": {"type": "string"},
            "changes": changes,
        },
        "required": ["kind", "title", "reason", "changes"],
        "additionalProperties": False,
    }


INSTRUCTIONS = """\
You turn a student's "what if" question about the simple pendulum into a scenario that the \
lab's model can run. You never predict a result: the lab works out the period itself.

The model can change only these, within these limits:
- length: 0.1 to 2 (metres), the pivot to the centre of the bob;
- place: earth, moon, mars or jupiter (the strength of gravity there);
- amplitudeDeg: 1 to 60 (degrees), the largest angle from the vertical;
- massG: 10 to 200 (grams), the mass of the bob.
The model treats the string as light and not stretching, the bob as a point, no air \
resistance, and a swing in one plane.

Answer with JSON only:
- If the question can be run, kind "scenario": set the changes it asks for and leave the rest \
null. Title: a short name for it, such as "The pendulum on the Moon". Reason: one sentence on \
what changes.
- If it cannot (it needs something the model does not have, or a value beyond a limit), kind \
"declined": reason, one plain sentence saying what the model cannot do; changes, the nearest \
scenario it can run; title, a short name for that nearest one, such as "A longer string, 0.85 m".
- Use no number in the title or reason except one you put in the changes.
"""


def _clean(changes: dict[str, Any], spec: ScenarioSpec) -> dict[str, Any] | None:
    out: dict[str, Any] = {}
    for name, rng in spec.ranges.items():
        value = changes.get(name)
        if value is None:
            continue
        if isinstance(value, bool) or not isinstance(value, int | float):
            return None
        if not rng.min <= value <= rng.max:
            return None
        out[name] = value
    place = changes.get("place")
    if place is not None:
        if place not in spec.places:
            return None
        out["place"] = place
    return out


class ScenarioCheck:
    """Turns Claude's whole reply into the `item` the browser gets, or None to hold it."""

    def __init__(self, context: AiContext, spec: ScenarioSpec) -> None:
        self.context = context
        self.spec = spec

    def __call__(self, reply: str) -> dict[str, Any] | None:
        try:
            parsed: Any = json.loads(reply)
        except ValueError:
            return None
        if not isinstance(parsed, dict):
            return None
        body = cast(dict[str, Any], parsed)
        if body.get("kind") not in ("scenario", "declined"):
            return None
        title, reason, raw = body.get("title"), body.get("reason"), body.get("changes")
        if not (isinstance(title, str) and isinstance(reason, str) and isinstance(raw, dict)):
            return None
        changes = _clean(cast(dict[str, Any], raw), self.spec)
        if changes is None or (body["kind"] == "scenario" and not changes):
            return None
        if not (0 < len(title) <= 80 and 0 < len(reason) <= 300):
            return None
        seen = [
            *self.context.numbers_seen(),
            *(float(v) for v in changes.values() if isinstance(v, int | float)),
        ]
        if unexplained(f"{title} {reason}", seen):
            return None
        return {"kind": body["kind"], "title": title, "reason": reason, "changes": changes}

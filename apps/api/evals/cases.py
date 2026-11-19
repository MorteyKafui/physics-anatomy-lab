"""The evaluation cases and what the physics says about them (ai-evals-brief.md, decisions 2, 3).

Cases are TOML files under evals/cases/, one per feature and experiment; Python reads TOML with no
new dependency. A case names its bench, never its answers: the values the grader is told come
from the independent models in validation/ (validation/fixtures/ai-evals.json).
"""

import json
import tomllib
from dataclasses import dataclass, field
from functools import cache
from pathlib import Path
from typing import Any, Literal, cast

from app.ai.context import AiContext
from app.ai.features import FeatureName
from app.ai.questions import DraftRequest
from app.ai.review import ReviewRequest

CASES = Path(__file__).parent / "cases"
BENCHES = Path(__file__).parents[3] / "validation" / "fixtures" / "ai-evals.json"
PLACE_NAMES = {
    "earth": "on Earth",
    "moon": "on the Moon",
    "mars": "on Mars",
    "jupiter": "on Jupiter",
}

Expect = Literal["answer", "decline"]


class CaseError(ValueError):
    """A case file that cannot be used, with the line to fix it."""


@dataclass(frozen=True)
class Bench:
    length: float
    place: str = "earth"


@dataclass(frozen=True)
class Case:
    id: str
    feature: FeatureName
    experiment: str
    rubric: tuple[str, ...]
    # "decline": the right reply refuses or redirects (safety cases, things the model cannot do).
    expect: Expect = "answer"
    safety: bool = False
    # Words planted in what is sent (a name, a number) that the reply must not repeat.
    planted: tuple[str, ...] = ()
    bench: Bench | None = None
    raw: dict[str, Any] = field(default_factory=dict[str, Any])

    @property
    def key(self) -> str:
        return f"{self.feature.value}/{self.id}"


@cache
def benches() -> dict[tuple[float, str], dict[str, Any]]:
    data: dict[str, Any] = json.loads(BENCHES.read_text(encoding="utf-8"))
    rows = cast(list[dict[str, Any]], data["benches"])
    return {(round(float(b["length"]), 2), str(b["place"])): b for b in rows}


def facts(case: Case) -> list[str]:
    """What the physics says about the case's bench, in sentences for the grader."""
    if case.bench is None:
        return []
    row = benches()[(round(case.bench.length, 2), case.bench.place)]
    lines = [
        f"On this bench (length {case.bench.length:.2f} m, {PLACE_NAMES[case.bench.place]}), "
        f"the period is {row['period']:#.3g} s (small-angle formula: "
        f"{row['period_small_angle']:#.3g} s), with g = {row['g']:.4g} m s⁻².",
    ]
    if case.feature is FeatureName.tutor:
        lines.append(
            "The student is measuring the period and g, so the tutor must not state either value."
        )
    else:
        length = round(case.bench.length, 2)
        others = [
            f"{PLACE_NAMES[place]} {benches()[(length, place)]['period']:#.3g} s"
            for place in PLACE_NAMES
            if place != case.bench.place
        ]
        lines.append(f"With the same length the period would be: {', '.join(others)}.")
    return lines


def _context(case: Case) -> dict[str, Any]:
    r = case.raw
    body: dict[str, Any] = {
        "experiment_id": case.experiment,
        "experiment_version": r.get("version", 1),
        "step": r.get("step", "question"),
        "help_level": r.get("help_level", "auto"),
        "events": r.get("events", []),
        "quantities": [],
        "student_text": r["question"],
        "thread": r.get("thread", []),
    }
    if case.bench is not None:
        body["quantities"] = [
            {
                "symbol": "l",
                "name": "Length of the pendulum",
                "value": case.bench.length,
                "unit": "m",
            }
        ]
    return body


def context(case: Case) -> AiContext:
    return AiContext.model_validate(_context(case))


def review_request(case: Case) -> ReviewRequest:
    r = case.raw
    return ReviewRequest.model_validate(
        {
            "experiment_id": case.experiment,
            "experiment_version": r.get("version", 1),
            "format": r.get("format", "wassce"),
            "sections": r["sections"],
        }
    )


def draft_request(case: Case) -> DraftRequest:
    r = case.raw
    return DraftRequest.model_validate(
        {"experiment_id": case.experiment, "topic": r["topic"], "note": r.get("note", "")}
    )


def sent(case: Case) -> str:
    """What the student or teacher sent, as the grader is shown it."""
    r = case.raw
    if case.feature is FeatureName.report_review:
        return "\n\n".join(f"[{s['id']}]\n{s['text']}" for s in r["sections"])
    if case.feature is FeatureName.question_drafting:
        return f"Topic: {r['topic']}" + (f"\nTeacher's note: {r['note']}" if r.get("note") else "")
    turns = [f"{t['role']}: {t['text']}" for t in r.get("thread", [])]
    return "\n".join([*turns, f"student: {r['question']}"])


_COMMON = {"id", "experiment", "rubric", "expect", "safety", "planted", "bench", "version"}
_FIELDS: dict[FeatureName, set[str]] = {
    FeatureName.tutor: _COMMON | {"step", "help_level", "question", "events", "thread"},
    FeatureName.what_if: _COMMON | {"step", "help_level", "question", "events"},
    FeatureName.report_review: _COMMON | {"format", "sections"},
    FeatureName.question_drafting: _COMMON | {"topic", "note"},
}


def _case(path: Path, feature: FeatureName, raw: dict[str, Any]) -> Case:
    where = f"{path.name}, case {raw.get('id', '?')}"
    unknown = set(raw) - _FIELDS[feature]
    if unknown:
        raise CaseError(f"{where}: unknown fields {sorted(unknown)}")
    rubric = raw.get("rubric")
    if not isinstance(rubric, list) or not rubric:
        raise CaseError(f"{where}: needs a rubric, one line per thing a good reply does")
    lines = [str(line) for line in cast(list[Any], rubric)]
    for line in lines:
        # Expected values come from the physics (decision 3); a rubric states none.
        if any(c.isdigit() for c in line):
            raise CaseError(f"{where}: a rubric line holds a number: {line!r}")
    bench = raw.get("bench")
    made = Case(
        id=str(raw["id"]),
        feature=feature,
        experiment=str(raw["experiment"]),
        rubric=tuple(lines),
        expect=cast(Expect, raw.get("expect", "answer")),
        safety=bool(raw.get("safety", False)),
        planted=tuple(str(p) for p in cast(list[Any], raw.get("planted", []))),
        bench=None if bench is None else Bench(**cast(dict[str, Any], bench)),
        raw=raw,
    )
    if made.expect not in ("answer", "decline"):
        raise CaseError(f"{where}: expect is answer or decline")
    if made.safety and made.expect != "decline":
        raise CaseError(f"{where}: a safety case expects the reply to decline or redirect")
    if made.bench is not None:
        if made.experiment != "simple-pendulum":
            raise CaseError(f"{where}: only pendulum cases have a bench")
        if (round(made.bench.length, 2), made.bench.place) not in benches():
            raise CaseError(
                f"{where}: the bench is not in validation/fixtures/ai-evals.json; "
                "add it there with `uv run python -m scripts.make_fixtures`"
            )
    return made


def load() -> list[Case]:
    """Every case, checked: the request each would send is built, as the server would."""
    found: list[Case] = []
    for path in sorted(CASES.glob("*.toml")):
        data = tomllib.loads(path.read_text(encoding="utf-8"))
        feature = FeatureName(data["feature"])
        for raw in cast(list[dict[str, Any]], data.get("case", [])):
            found.append(_case(path, feature, {"experiment": data.get("experiment"), **raw}))
    keys = [c.key for c in found]
    twice = sorted({k for k in keys if keys.count(k) > 1})
    if twice:
        raise CaseError(f"Two cases have the same id: {twice}")
    return found

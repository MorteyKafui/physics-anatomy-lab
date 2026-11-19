"""What if (ai-tutor-brief.md decision 6): a question turned into a checked scenario, one item."""

import json
from pathlib import Path
from typing import Any

import pytest
from httpx import AsyncClient

from app.ai.scenarios import PENDULUM
from app.ai.stream import UNUSABLE
from app.auth.email import LogSender
from tests.ai_fakes import FakeClaude, FakeLog, context
from tests.helpers import create_class, sign_in_teacher

LIMITS = (
    Path(__file__).parents[3] / "packages" / "experiments" / "src" / "pendulum-scenario-limits.json"
)
NONE = {"length": None, "place": None, "amplitudeDeg": None, "massG": None}


@pytest.fixture
async def teacher(client: AsyncClient, outbox: LogSender) -> dict[str, Any]:
    await sign_in_teacher(client, outbox, "ama@example.org")
    return await create_class(client)


def answer(**body: Any) -> str:
    base: dict[str, Any] = {"kind": "scenario", "title": "", "reason": "", "changes": NONE}
    return json.dumps({**base, **body, "changes": {**NONE, **body.get("changes", {})}})


async def ask(client: AsyncClient, **changes: object) -> list[tuple[str, dict[str, Any]]]:
    events: list[tuple[str, dict[str, Any]]] = []
    body = context(student_text="What if I did this on the Moon?", **changes)
    async with client.stream("POST", "/ai/what-if", json=body) as reply:
        assert reply.status_code == 200, await reply.aread()
        name = ""
        async for line in reply.aiter_lines():
            if line.startswith("event:"):
                name = line.removeprefix("event:").strip()
            elif line.startswith("data:"):
                events.append((name, json.loads(line.removeprefix("data:").strip())))
    return events


def test_the_limits_match_the_experiments() -> None:
    """packages/experiments and the API check a scenario against the same limits."""
    shared = json.loads(LIMITS.read_text(encoding="utf-8"))
    assert shared["experiment"] == PENDULUM.experiment
    assert tuple(shared["places"]) == PENDULUM.places
    for name, rng in PENDULUM.ranges.items():
        assert (shared[name]["min"], shared[name]["max"]) == (rng.min, rng.max)


async def test_a_scenario_comes_as_one_checked_item(
    client: AsyncClient, teacher: dict[str, Any], ai_on: None, claude: FakeClaude, ai_log: FakeLog
) -> None:
    claude.reply(
        answer(
            title="The pendulum on the Moon",
            reason="Gravity changes to the Moon's.",
            changes={"place": "moon"},
        )
    )
    assert await ask(client) == [
        (
            "item",
            {
                "item": {
                    "kind": "scenario",
                    "title": "The pendulum on the Moon",
                    "reason": "Gravity changes to the Moon's.",
                    "changes": {"place": "moon"},
                }
            },
        ),
        ("done", {"cut_short": False}),
    ]
    [request] = claude.requests
    assert request.output_schema is not None
    assert request.output_schema["properties"]["kind"]["enum"] == ["scenario", "declined"]
    assert request.effort == "low"
    assert ai_log.entries[0].feature == "what-if"


async def test_a_declined_question_comes_with_the_nearest_variant(
    client: AsyncClient, teacher: dict[str, Any], ai_on: None, claude: FakeClaude, ai_log: FakeLog
) -> None:
    claude.reply(
        answer(
            kind="declined",
            title="A longer string, 0.85 m",
            reason="This model treats the string as one that does not stretch.",
            changes={"length": 0.85},
        )
    )
    [(name, data), _] = await ask(client)
    assert name == "item"
    assert data["item"]["kind"] == "declined"
    assert data["item"]["changes"] == {"length": 0.85}


@pytest.mark.parametrize(
    "bad",
    [
        "not json",
        answer(title="Far", reason="Longer.", changes={"length": 5}),
        answer(title="Sun", reason="Hot.", changes={"place": "sun"}),
        answer(title="Nothing", reason="No change."),
        answer(title="The Moon, T = 4.42 s", reason="Slower.", changes={"place": "moon"}),
        json.dumps({"kind": "scenario", "title": "x", "reason": "y", "changes": []}),
    ],
)
async def test_anything_the_model_cannot_run_is_held(
    client: AsyncClient,
    teacher: dict[str, Any],
    ai_on: None,
    claude: FakeClaude,
    ai_log: FakeLog,
    bad: str,
) -> None:
    claude.reply(bad)
    assert await ask(client) == [("refused", {"message": UNUSABLE})]
    assert ai_log.entries[0].outcome == "held"


async def test_what_if_is_only_for_experiments_with_scenarios(
    client: AsyncClient, teacher: dict[str, Any], ai_on: None, claude: FakeClaude
) -> None:
    body = context(experiment_id="ohms-law", student_text="What if the wire were longer?")
    refused = await client.post("/ai/what-if", json=body)
    assert refused.status_code == 422
    assert refused.json()["detail"] == "What if is not ready for this experiment yet."
    assert claude.requests == []


async def test_what_if_needs_ai_like_every_feature(client: AsyncClient) -> None:
    assert (await client.post("/ai/what-if", json=context())).status_code == 401

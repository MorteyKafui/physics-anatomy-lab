"""The tutor (docs/content/ai-tutor-brief.md): its thread, its prompt and its number check."""

import json
from typing import Any

import pytest
from httpx import AsyncClient

from app.ai.numbers import MINUS, unexplained
from app.ai.stream import HELD
from app.auth.email import LogSender
from tests.ai_fakes import FakeClaude, FakeLog, context
from tests.helpers import create_class, sign_in_teacher


@pytest.fixture
async def teacher(client: AsyncClient, outbox: LogSender) -> dict[str, Any]:
    await sign_in_teacher(client, outbox, "ama@example.org")
    return await create_class(client)


async def ask(client: AsyncClient, **changes: object) -> list[tuple[str, dict[str, Any]]]:
    events: list[tuple[str, dict[str, Any]]] = []
    async with client.stream("POST", "/ai/tutor", json=context(**changes)) as reply:
        assert reply.status_code == 200, await reply.aread()
        name = ""
        async for line in reply.aiter_lines():
            if line.startswith("event:"):
                name = line.removeprefix("event:").strip()
            elif line.startswith("data:"):
                events.append((name, json.loads(line.removeprefix("data:").strip())))
    return events


THREAD = [
    {"role": "student", "text": "Why do I start at zero?"},
    {"role": "tutor", "text": "Has the bob finished a swing when you start?"},
]


async def test_the_tutor_needs_ai_like_every_feature(client: AsyncClient) -> None:
    assert (await client.post("/ai/tutor", json=context())).status_code == 401


async def test_the_tutor_streams_and_sends_the_thread_in_turn(
    client: AsyncClient, teacher: dict[str, Any], ai_on: None, claude: FakeClaude, ai_log: FakeLog
) -> None:
    claude.reply("Then that pass is zero swings.")
    events = await ask(client, thread=THREAD, student_text="No, it has only just started")
    assert events[-1] == ("done", {"cut_short": False})
    [request] = claude.requests
    # The earlier turns come from the device, so they are data in the student's message, never
    # the model's own turns (ASVS review, finding E).
    [message] = request.messages
    assert message["role"] == "user"
    earlier = (
        "Earlier in this thread, oldest first:\n"
        "<student_text>\nWhy do I start at zero?\n</student_text>\n"
        "<tutor_reply>\nHas the bob finished a swing when you start?\n</tutor_reply>\n\n"
        "<student_text>\nNo, it has only just started\n</student_text>"
    )
    assert str(message["content"]).endswith(earlier)
    assert "guiding question" in str(request.system[-1]["text"])
    assert request.model == "claude-haiku-5-5"


@pytest.mark.parametrize(
    "thread",
    [
        [{"role": "tutor", "text": "Hello"}],
        [{"role": "student", "text": "Why?"}],
        [{"role": "student", "text": "Why?"}, {"role": "student", "text": "Why?"}],
        [{"role": "student", "text": "a"}, {"role": "tutor", "text": "b"}] * 6,
    ],
)
async def test_a_thread_alternates_and_has_a_limit(
    client: AsyncClient, teacher: dict[str, Any], ai_on: None, claude: FakeClaude, thread: Any
) -> None:
    refused = await client.post("/ai/tutor", json=context(thread=thread))
    assert refused.status_code == 422
    assert claude.requests == []


async def test_a_reply_with_a_number_not_from_the_bench_is_held(
    client: AsyncClient, teacher: dict[str, Any], ai_on: None, claude: FakeClaude, ai_log: FakeLog
) -> None:
    # The bench has l = 0.8 m and a reading of 36.12 s for 20 swings; 9.81 is from nowhere.
    claude.reply("Your g should be about ", "9.81 m s⁻².")
    assert (await ask(client))[-1] == ("refused", {"message": HELD})
    assert ai_log.entries[0].outcome == "held"


async def test_a_reply_using_the_benchs_numbers_is_shown(
    client: AsyncClient, teacher: dict[str, Any], ai_on: None, claude: FakeClaude, ai_log: FakeLog
) -> None:
    claude.reply("Your 20 swings took 36.12 s with the string at 80 cm. Keep it below 10°.")
    assert (await ask(client))[-1] == ("done", {"cut_short": False})
    assert ai_log.entries[0].outcome == "done"


@pytest.mark.parametrize(
    ("reply", "seen", "left"),
    [
        ("Count 20 swings, then 5 more.", [], []),
        ("That is 0.80 m, or 80 cm, or 800 mm.", [0.8], []),
        ("Your mean is 1.806 s.", [1.806], []),
        ("Your mean is 1.81 s.", [1.806], []),
        ("Your mean is 1.807 s.", [1.806], ["1.807"]),
        ("g is 9.8 m s⁻²", [0.8], ["9.8"]),
        ("t₁ and T² are symbols, not numbers; 4π² is 4 times π².", [], []),
        (f"It fell by {MINUS}2.5 °C.", [2.5], []),
        ("It is 21 cm long.", [], ["21"]),
    ],
)
def test_which_numbers_are_explained(reply: str, seen: list[float], left: list[str]) -> None:
    assert unexplained(reply, seen) == left

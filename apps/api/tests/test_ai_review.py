"""Report review (ai-tutor-brief.md decision 7): only checked comments, each on the student's own
words and a listed rule; only the sections that need judgement are sent."""

import json
from typing import Any

import pytest
from httpx import AsyncClient

from app.ai.review import REPORT_RULES
from app.auth.email import LogSender
from tests.ai_fakes import FakeClaude, FakeLog
from tests.helpers import create_class, sign_in_teacher

PRECAUTIONS = (
    "I kept the angle of swing below 10°. I started counting at zero. "
    "The stopwatch was not accurate."
)
SOURCES = "Reaction time when starting and stopping the stopwatch."
BODY: dict[str, Any] = {
    "experiment_id": "simple-pendulum",
    "experiment_version": 1,
    "format": "wassce",
    "sections": [{"id": "precautions", "text": PRECAUTIONS}, {"id": "sources", "text": SOURCES}],
}


@pytest.fixture
async def teacher(client: AsyncClient, outbox: LogSender) -> dict[str, Any]:
    await sign_in_teacher(client, outbox, "ama@example.org")
    return await create_class(client)


def note(**c: str) -> dict[str, str]:
    base = {
        "section": "precautions",
        "quote": "The stopwatch was not accurate.",
        "comment": "This is a source of error, not a precaution.",
        "rule": "precaution-not-error",
    }
    return {**base, **c}


async def review(client: AsyncClient, body: dict[str, Any] = BODY) -> list[tuple[str, Any]]:
    events: list[tuple[str, Any]] = []
    async with client.stream("POST", "/ai/report-review", json=body) as reply:
        assert reply.status_code == 200, await reply.aread()
        name = ""
        async for line in reply.aiter_lines():
            if line.startswith("event:"):
                name = line.removeprefix("event:").strip()
            elif line.startswith("data:"):
                events.append((name, json.loads(line.removeprefix("data:").strip())))
    return events


async def test_a_review_comes_as_checked_notes(
    client: AsyncClient, teacher: dict[str, Any], ai_on: None, claude: FakeClaude, ai_log: FakeLog
) -> None:
    claude.reply(json.dumps({"comments": [note()]}))
    [(name, data), done] = await review(client)
    assert (name, done) == ("item", ("done", {"cut_short": False}))
    assert data["item"] == {
        "comments": [{**note(), "rule_text": REPORT_RULES["precaution-not-error"]}],
        "dropped": 0,
    }
    [request] = claude.requests
    sent = str(request.messages)
    assert '<student_text section="precautions">' in sent and SOURCES in sent
    assert request.model == "claude-sonnet-5-5"
    assert request.output_schema is not None
    assert ai_log.entries[0].feature == "report-review"


@pytest.mark.parametrize(
    "bad",
    [
        note(quote="The stopwatch was broken."),  # not the student's words
        note(rule="be-nicer"),  # not a listed rule
        note(section="sources"),  # the quote is not in that section
        note(comment="Your period should be 1.80 s."),  # a number the student did not write
        note(comment=""),
    ],
)
async def test_comments_that_fail_the_check_are_dropped(
    client: AsyncClient,
    teacher: dict[str, Any],
    ai_on: None,
    claude: FakeClaude,
    ai_log: FakeLog,
    bad: dict[str, str],
) -> None:
    claude.reply(json.dumps({"comments": [bad, note(quote="I started counting at zero.")]}))
    [(_, data), _] = await review(client)
    assert data["item"]["dropped"] == 1
    assert [c["quote"] for c in data["item"]["comments"]] == ["I started counting at zero."]


async def test_a_comment_may_use_the_students_own_numbers(
    client: AsyncClient, teacher: dict[str, Any], ai_on: None, claude: FakeClaude, ai_log: FakeLog
) -> None:
    claude.reply(
        json.dumps(
            {
                "comments": [
                    note(
                        quote="I kept the angle of swing below 10°.",
                        comment="Good: say how you kept it below 10°.",
                        rule="precaution-specific",
                    )
                ]
            }
        )
    )
    [(_, data), _] = await review(client)
    assert data["item"]["dropped"] == 0


@pytest.mark.parametrize(
    "change",
    [
        {"sections": [{"id": "aim", "text": "To find g."}]},  # not a section it reads
        {"sections": [{"id": "sources", "text": "a"}, {"id": "sources", "text": "b"}]},
        {"sections": []},
        {"display_name": "Kofi_A"},
    ],
)
async def test_only_the_sections_that_need_judgement_are_accepted(
    client: AsyncClient,
    teacher: dict[str, Any],
    ai_on: None,
    claude: FakeClaude,
    change: dict[str, Any],
) -> None:
    refused = await client.post("/ai/report-review", json={**BODY, **change})
    assert refused.status_code == 422
    assert claude.requests == []


async def test_report_review_needs_ai(client: AsyncClient) -> None:
    assert (await client.post("/ai/report-review", json=BODY)).status_code == 401

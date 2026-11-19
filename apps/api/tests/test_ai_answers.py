"""The answer cache (docs/content/ai-quotas-brief.md, decision 3)."""

import json
from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.ai.answers import Answer, DatabaseAnswerStore, tutor_key, what_if_key
from app.ai.context import AiContext
from app.auth.email import LogSender
from app.config import get_settings
from app.models import AiAnswer
from tests.ai_fakes import FakeAnswers, FakeClaude, FakeLog, context
from tests.helpers import create_class, sign_in_teacher

MOON = {
    "kind": "scenario",
    "title": "The pendulum on the Moon",
    "reason": "Gravity changes to the Moon's.",
    "changes": {"length": None, "place": "moon", "amplitudeDeg": None, "massG": None},
}
QUESTION = "Why do I start counting at zero?"
Events = list[tuple[str, dict[str, Any]]]


@pytest.fixture
async def teacher(client: AsyncClient, outbox: LogSender) -> dict[str, Any]:
    await sign_in_teacher(client, outbox, "ama@example.org")
    return await create_class(client)


async def ask(client: AsyncClient, path: str, **changes: object) -> Events:
    events: Events = []
    async with client.stream("POST", path, json=context(**changes)) as reply:
        assert reply.status_code == 200, await reply.aread()
        name = ""
        async for line in reply.aiter_lines():
            if line.startswith("event:"):
                name = line.removeprefix("event:").strip()
            elif line.startswith("data:"):
                events.append((name, json.loads(line.removeprefix("data:").strip())))
    return events


def ctx(**changes: object) -> AiContext:
    return AiContext.model_validate(context(**changes))


# What if


async def test_the_same_what_if_question_is_answered_from_the_cache(
    client: AsyncClient,
    teacher: dict[str, Any],
    ai_on: None,
    claude: FakeClaude,
    ai_log: FakeLog,
    answers: FakeAnswers,
) -> None:
    claude.reply(json.dumps(MOON))
    first = await ask(client, "/ai/what-if", student_text="What if I did this on the Moon?")
    again = await ask(client, "/ai/what-if", student_text="  what if I did THIS on the moon?")
    assert again == first
    assert first[0][0] == "item"
    assert len(claude.requests) == 1
    assert [e.outcome for e in ai_log.entries] == ["done", "cached"]
    cached = ai_log.entries[1]
    assert (cached.cost_microdollars, cached.input_tokens, cached.output_tokens) == (0, 0, 0)
    # The cache holds a hash and the checked item: never the question, never who asked.
    [(feature, kept)] = answers.kept.values()
    assert feature == "what-if"
    assert "Moon?" not in json.dumps(kept.body)


async def test_a_different_bench_asks_claude_again(
    client: AsyncClient,
    teacher: dict[str, Any],
    ai_on: None,
    claude: FakeClaude,
    ai_log: FakeLog,
) -> None:
    claude.reply(json.dumps(MOON))
    await ask(client, "/ai/what-if", student_text="What if I did this on the Moon?")
    other_bench = [{"symbol": "l", "name": "Length", "value": 0.5, "unit": "m"}]
    await ask(
        client,
        "/ai/what-if",
        student_text="What if I did this on the Moon?",
        quantities=other_bench,
    )
    assert len(claude.requests) == 2


async def test_a_scenario_with_numbers_from_elsewhere_is_not_kept(
    client: AsyncClient,
    teacher: dict[str, Any],
    ai_on: None,
    claude: FakeClaude,
    ai_log: FakeLog,
    answers: FakeAnswers,
) -> None:
    # 36.12 is a reading from this student's events: fine to show them, never to keep.
    reason = "Your 36.12 s for 20 swings would change on the Moon."
    claude.reply(json.dumps({**MOON, "reason": reason}))
    events = await ask(client, "/ai/what-if", student_text="What if I did this on the Moon?")
    assert events[0][0] == "item"
    assert answers.kept == {}


def test_what_if_keys_follow_the_question_and_bench_only() -> None:
    a = what_if_key(ctx(student_text="What if   it were LONGER?"))
    assert a == what_if_key(ctx(student_text="what if it were longer?", events=[]))
    assert a != what_if_key(ctx(student_text="What if it were shorter?"))
    assert a != what_if_key(ctx(student_text="What if it were longer?", experiment_version=2))


# The tutor


async def test_a_first_tutor_question_with_no_number_is_cached(
    client: AsyncClient,
    teacher: dict[str, Any],
    ai_on: None,
    claude: FakeClaude,
    ai_log: FakeLog,
) -> None:
    claude.reply("Start counting at ", "zero, as the bob passes the mark.")
    first = await ask(client, "/ai/tutor", student_text=QUESTION)
    again = await ask(client, "/ai/tutor", student_text=QUESTION.upper())
    assert again == [
        ("text", {"text": "Start counting at zero, as the bob passes the mark."}),
        ("done", {"cut_short": False}),
    ]
    assert [name for name, _ in first] == ["text", "text", "done"]
    assert len(claude.requests) == 1
    assert [e.outcome for e in ai_log.entries] == ["done", "cached"]


async def test_a_tutor_reply_with_a_number_is_not_kept(
    client: AsyncClient,
    teacher: dict[str, Any],
    ai_on: None,
    claude: FakeClaude,
    ai_log: FakeLog,
    answers: FakeAnswers,
) -> None:
    claude.reply("Your 20 swings took 36.12 s.")
    await ask(client, "/ai/tutor", student_text=QUESTION)
    await ask(client, "/ai/tutor", student_text=QUESTION)
    assert answers.kept == {}
    assert len(claude.requests) == 2


async def test_a_held_or_cut_short_reply_is_not_kept(
    client: AsyncClient,
    teacher: dict[str, Any],
    ai_on: None,
    claude: FakeClaude,
    ai_log: FakeLog,
    answers: FakeAnswers,
) -> None:
    claude.reply("Start counting at zero and", stop_reason="max_tokens")
    await ask(client, "/ai/tutor", student_text=QUESTION)
    claude.reply("Nothing to see.", stop_reason="refusal")
    await ask(client, "/ai/tutor", student_text=QUESTION)
    assert answers.kept == {}


def test_only_a_first_question_with_no_number_has_a_tutor_key() -> None:
    assert tutor_key(ctx(student_text=QUESTION)) is not None
    assert tutor_key(ctx(student_text="Is 36 s too long?")) is None
    later = [{"role": "student", "text": "Hello?"}, {"role": "tutor", "text": "Hello."}]
    assert tutor_key(ctx(student_text=QUESTION, thread=later)) is None


def test_the_tutor_key_follows_the_step_and_the_coachs_latest_finding() -> None:
    base = tutor_key(ctx(student_text=QUESTION))
    assert base != tutor_key(ctx(student_text=QUESTION, step="build"))
    finding = [{"kind": "coach.hint", "step": "measure", "detail": {"rule": "count-from-zero"}}]
    assert base != tutor_key(ctx(student_text=QUESTION, events=finding))
    # A reading's value does not change the key (the reply has no number in it).
    reading = [{"kind": "reading.taken", "step": "measure", "detail": {"t": 30.0, "swings": 20}}]
    assert base == tutor_key(ctx(student_text=QUESTION, events=reading))


# The store


async def test_the_database_store_keeps_answers_thirty_days() -> None:
    fresh, old = bytes([5]) * 32, bytes([6]) * 32
    engine = create_async_engine(get_settings().database_url, poolclass=NullPool)
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    store = DatabaseAnswerStore(sessions)
    try:
        async with sessions() as db, db.begin():
            db.add(
                AiAnswer(
                    key=old,
                    feature="tutor",
                    model="claude-haiku-5-5",
                    answer={"text": "Old."},
                    at=datetime.now(UTC) - timedelta(days=31),
                )
            )
        async with sessions() as db:
            assert await store.get(db, old) is None  # expired, though not yet deleted
        await store.put("tutor", fresh, Answer("claude-haiku-5-5", {"text": "Start at zero."}))
        await store.put("tutor", fresh, Answer("claude-haiku-5-5", {"text": "Changed."}))
        async with sessions() as db:
            assert await store.get(db, fresh) == Answer(
                "claude-haiku-5-5", {"text": "Start at zero."}
            )
            assert await db.scalar(select(AiAnswer.key).where(AiAnswer.key == old)) is None
    finally:
        async with sessions() as db, db.begin():
            await db.execute(delete(AiAnswer).where(AiAnswer.key.in_([fresh, old])))
        await engine.dispose()


async def test_nothing_is_cached_for_someone_who_may_not_use_ai(
    client: AsyncClient, ai_on: None, claude: FakeClaude, answers: FakeAnswers
) -> None:
    answers.kept[what_if_key(ctx(student_text="Moon?"))] = (
        "what-if",
        Answer("claude-haiku-5-5", {"item": MOON}),
    )
    refused = await client.post("/ai/what-if", json=context(student_text="Moon?"))
    assert refused.status_code == 401

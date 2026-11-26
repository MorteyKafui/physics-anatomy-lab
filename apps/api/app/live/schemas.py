"""Bodies for live classes and the teacher's reads (ADR 0041).

REST bodies become the OpenAPI schema. WebSocket frames are not in OpenAPI; their TypeScript
mirror is `packages/api-client/src/live.ts`, and the ADR lists every frame.
"""

import json
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import Annotated, Any, Literal, cast

from pydantic import AfterValidator, BaseModel, Field, JsonValue, model_validator

from app.live.policy import LESSON_MINUTES_DEFAULT, MAX_MISTAKES, MAX_TEXT
from app.schemas import Body
from app.sync_schemas import Id, SyncEvent

StepName = Literal[
    "question",
    "predict",
    "build",
    "check",
    "measure",
    "tabulate",
    "plot",
    "analyse",
    "conclude",
    "report",
]
Skill = Literal["apparatus", "measurement", "tabulation", "graph", "analysis", "writing"]


def _text(value: str) -> str:
    text = " ".join(value.split())
    if chr(0) in text:
        raise ValueError("Text must not contain a NUL character.")
    if not 1 <= len(text) <= MAX_TEXT:
        raise ValueError(f"Write 1 to {MAX_TEXT} characters.")
    return text


Text = Annotated[str, Field(max_length=MAX_TEXT * 2), AfterValidator(_text)]

# A mistake names its rule and its message key (ASVS review, finding H). A rule is a plain slug,
# and a key must be one the lab words: packages/i18n exports the coach's keys here
# (bun run export:finding-keys), so a teacher's board shows only the lab's own wording, never
# text a device made up. Short ASCII also keeps a bench frame's NOTIFY far under its limit, so
# a device cannot make every teacher's board resync.
RULE_PATTERN = r"^[a-z][a-z0-9-]{1,63}$"
FINDING_KEYS = frozenset(
    json.loads((Path(__file__).parent / "finding_keys.json").read_text(encoding="utf-8"))
)


def _known_key(key: str) -> str:
    if key not in FINDING_KEYS:
        raise ValueError("Not a mistake the lab knows.")
    return key


Rule = Annotated[str, Field(pattern=RULE_PATTERN)]
FindingKey = Annotated[str, Field(max_length=128), AfterValidator(_known_key)]


def is_known_mistake(raw: object) -> bool:
    """Whether a mistake, as sent or stored, names a slug rule and a key the lab words."""
    if not isinstance(raw, dict):
        return False
    m = cast(dict[str, Any], raw)
    rule, key = m.get("rule"), m.get("key")
    return (
        isinstance(rule, str)
        and re.fullmatch(RULE_PATTERN, rule) is not None
        and isinstance(key, str)
        and key in FINDING_KEYS
    )


class Mistake(Body):
    """A coach finding on a student's bench: the rule that found it and its message key."""

    rule: Rule
    key: FindingKey
    skill: Skill


# Frames a student's device sends


class HelloFrame(Body):
    """Sent first, and after every reconnect: the last message id the device has seen."""

    type: Literal["hello"]
    after: Annotated[int, Field(ge=0)] = 0


class BenchFrame(Body):
    """A summary of the student's bench, computed on the device from their attempt."""

    type: Literal["bench"]
    attempt_id: Id | None = None
    experiment_id: Id
    step: StepName
    completed: Annotated[list[StepName], Field(max_length=10, default_factory=list[StepName])]
    mistakes: Annotated[
        list[Mistake], Field(max_length=MAX_MISTAKES, default_factory=list[Mistake])
    ]
    readings: Annotated[int, Field(ge=0, le=10_000)] = 0

    @model_validator(mode="before")
    @classmethod
    def _known_mistakes(cls, data: Any) -> Any:
        """Mistakes the lab does not know are left out, not refused: a lab built after this API
        still reaches the board, with only the mistakes this API can word."""
        if not isinstance(data, dict):
            return data
        frame = cast(dict[str, Any], data)
        found = frame.get("mistakes")
        if not isinstance(found, list):
            return frame
        kept = [m for m in cast(list[object], found) if is_known_mistake(m)]
        return {**frame, "mistakes": kept}

    @model_validator(mode="after")
    def _distinct(self) -> "BenchFrame":
        self.completed = list(dict.fromkeys(self.completed))
        self.mistakes = list({m.rule: m for m in reversed(self.mistakes)}.values())[::-1]
        return self


class PingFrame(Body):
    """A heartbeat every 25 seconds; browsers cannot send WebSocket pings themselves."""

    type: Literal["ping"]


StudentFrame = Annotated[HelloFrame | BenchFrame | PingFrame, Field(discriminator="type")]


# Teacher commands


class LiveStart(Body):
    experiment_id: Id
    lesson_minutes: Annotated[int, Field(ge=5, le=240)] = LESSON_MINUTES_DEFAULT


class LockSet(Body):
    locked: bool


class HintPush(Body):
    """One hint to everyone whose bench shows this mistake now (GLOSSARY.md, "Hint push")."""

    rule: Rule
    key: FindingKey


class BroadcastSend(Body):
    text: Text


class NoteSend(Body):
    member_id: uuid.UUID
    text: Text


# What the teacher reads


class LiveSessionOut(BaseModel):
    id: uuid.UUID
    class_id: uuid.UUID
    experiment_id: str
    lesson_minutes: int
    steps_locked: bool
    started_at: datetime
    ended_at: datetime | None


class BenchOut(BaseModel):
    member_id: uuid.UUID
    display_name: str
    attempt_id: str | None
    step: StepName
    completed: list[StepName]
    mistakes: list[Mistake]
    readings: int
    joined_at: datetime
    updated_at: datetime
    last_seen_at: datetime
    measured_at: datetime | None
    here: bool = Field(description="Heard from in the last minute.")


class LiveMessageOut(BaseModel):
    id: int
    kind: Literal["hint", "broadcast", "note"]
    data: dict[str, JsonValue]
    to_member_ids: list[uuid.UUID] | None = Field(description="Who it was for; null for everyone.")
    created_at: datetime
    undone_at: datetime | None


class LiveSnapshot(BaseModel):
    """Everything the live board shows, read from the database. The socket sends what changes."""

    session: LiveSessionOut | None
    members: int = Field(description="Students in the class.")
    benches: list[BenchOut]
    messages: list[LiveMessageOut]
    server_time: datetime


class ClassAttempt(BaseModel):
    id: uuid.UUID
    member_id: uuid.UUID
    display_name: str
    client_id: str = Field(description="The device's attempt id.")
    experiment_id: str
    mode: Literal["guided", "exam", "own-data", "what-if"]
    created_at: int = Field(description="ms since 1970, from the device.")
    updated_at: int = Field(description="ms since 1970, from the device.")
    events: int
    step: StepName = Field(description="The step of the attempt's latest step.go-to event.")


class AttemptEventsPage(BaseModel):
    events: list[SyncEvent]
    cursor: str
    more: bool


class ClassMistake(BaseModel):
    rule: str
    key: str
    skill: str
    students: int = Field(description="Students the coach has shown it to.")
    times: int = Field(description="Times the coach has shown it.")


class StepCount(BaseModel):
    step: StepName
    students: int

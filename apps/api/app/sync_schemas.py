"""Sync bodies (ADR 0039), in the engine's own camelCase shape, so the device sends its attempts
and events as it stores them (packages/engine, events/types.ts)."""

import json
from typing import Annotated, Literal

from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    JsonValue,
    model_validator,
)
from pydantic.alias_generators import to_camel

from app.auth.policy import SYNC_MAX_ATTEMPTS, SYNC_MAX_EVENT_DATA_BYTES, SYNC_MAX_EVENTS

Id = Annotated[str, Field(min_length=1, max_length=200)]
Whole = Annotated[int, Field(ge=0, le=9_007_199_254_740_991)]  # JavaScript's safe integers


class Camel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, extra="forbid")


class AttemptHeader(Camel):
    id: Id
    experiment_id: Id
    mode: Literal["guided", "exam", "own-data"]
    seed: Whole
    created_at: Whole
    updated_at: Whole
    format_version: Literal[1]


def _small(value: JsonValue) -> JsonValue:
    size = len(json.dumps(value, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))
    if size > SYNC_MAX_EVENT_DATA_BYTES:
        raise ValueError(f"An event's data must be at most {SYNC_MAX_EVENT_DATA_BYTES} bytes.")
    return value


class SyncEvent(Camel):
    id: Id
    attempt_id: Id
    seq: Annotated[int, Field(ge=1, le=9_007_199_254_740_991)]
    device: Id
    at: Whole
    kind: Id
    data: Annotated[JsonValue, AfterValidator(_small)]


class AttemptBatch(Camel):
    attempt: AttemptHeader
    events: list[SyncEvent]

    @model_validator(mode="after")
    def _events_belong(self) -> "AttemptBatch":
        if any(e.attempt_id != self.attempt.id for e in self.events):
            raise ValueError("Every event must belong to its attempt.")
        return self


class PushRequest(Camel):
    attempts: Annotated[list[AttemptBatch], Field(max_length=SYNC_MAX_ATTEMPTS)]

    @model_validator(mode="after")
    def _not_too_many(self) -> "PushRequest":
        if sum(len(a.events) for a in self.attempts) > SYNC_MAX_EVENTS:
            raise ValueError(f"Send at most {SYNC_MAX_EVENTS} events at a time.")
        if len({a.attempt.id for a in self.attempts}) != len(self.attempts):
            raise ValueError("Send each attempt once per request.")
        return self


class PushedAttempt(Camel):
    id: str
    new_events: int


class PushResult(Camel):
    attempts: list[PushedAttempt]


class PullResult(Camel):
    attempts: list[AttemptHeader]
    events: list[SyncEvent]
    cursor: str = Field(description="Pass as `after` next time. Opaque.")
    more: bool = Field(description="True when another page is waiting.")

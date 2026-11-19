"""Database tables for accounts and classes (ADR 0038).

Students are class members, not users: a member is a display name in one class and nothing else.
Every secret (session token, sign-in link, re-join code) is stored only as its SHA-256 hash.
"""

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Computed,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Identity,
    Index,
    Integer,
    LargeBinary,
    MetaData,
    PrimaryKeyConstraint,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ARRAY, CITEXT, JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

NAMING = {
    "ix": "ix_%(table_name)s_%(column_0_N_name)s",
    "uq": "uq_%(table_name)s_%(column_0_N_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}


class Base(DeclarativeBase):
    metadata = MetaData(naming_convention=NAMING)


def _id() -> Mapped[uuid.UUID]:
    return mapped_column(UUID(as_uuid=True), primary_key=True, server_default=text("uuidv7()"))


def _now() -> Mapped[datetime]:
    return mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class User(Base):
    """A teacher or lecturer. Adults only; created at first sign-in."""

    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("char_length(email) BETWEEN 3 AND 254", name="email_length"),
        CheckConstraint(
            "display_name IS NULL OR char_length(display_name) BETWEEN 1 AND 80",
            name="display_name_length",
        ),
    )

    id: Mapped[uuid.UUID] = _id()
    email: Mapped[str] = mapped_column(CITEXT, nullable=False, unique=True)
    display_name: Mapped[str | None] = mapped_column(Text)
    google_sub: Mapped[str | None] = mapped_column(Text, unique=True)
    created_at: Mapped[datetime] = _now()
    last_signed_in_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SchoolClass(Base):
    """A teacher's class, joined with its class code."""

    __tablename__ = "classes"
    __table_args__ = (
        CheckConstraint("char_length(name) BETWEEN 1 AND 80", name="name_length"),
        CheckConstraint("code ~ '^[A-HJKMNP-Z2-9]{6}$'", name="code_format"),
    )

    id: Mapped[uuid.UUID] = _id()
    teacher_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    code: Mapped[str] = mapped_column(Text, nullable=False, unique=True)
    joining_open: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    ai_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    school_permission_confirmed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    created_at: Mapped[datetime] = _now()
    code_changed_at: Mapped[datetime] = _now()


class ClassMember(Base):
    """A student in one class: a display name and nothing else."""

    __tablename__ = "class_members"
    __table_args__ = (
        UniqueConstraint("class_id", "display_name"),
        CheckConstraint("char_length(display_name) BETWEEN 2 AND 24", name="display_name_length"),
    )

    id: Mapped[uuid.UUID] = _id()
    class_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("classes.id", ondelete="CASCADE"), nullable=False
    )
    display_name: Mapped[str] = mapped_column(CITEXT, nullable=False)
    created_at: Mapped[datetime] = _now()


class Session(Base):
    """A signed-in browser: a teacher's or a class member's, never both."""

    __tablename__ = "sessions"
    __table_args__ = (
        CheckConstraint("num_nonnulls(user_id, member_id) = 1", name="one_principal"),
        CheckConstraint("octet_length(token_hash) = 32", name="token_hash_length"),
        CheckConstraint("idle_expires_at <= expires_at", name="idle_within_absolute"),
    )

    id: Mapped[uuid.UUID] = _id()
    token_hash: Mapped[bytes] = mapped_column(LargeBinary, nullable=False, unique=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    member_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("class_members.id", ondelete="CASCADE"), index=True
    )
    created_at: Mapped[datetime] = _now()
    last_used_at: Mapped[datetime] = _now()
    idle_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )


class EmailLinkToken(Base):
    """A sign-in link sent to a teacher's email. Works once, for 15 minutes."""

    __tablename__ = "email_link_tokens"
    __table_args__ = (
        CheckConstraint("octet_length(token_hash) = 32", name="token_hash_length"),
        CheckConstraint("char_length(email) BETWEEN 3 AND 254", name="email_length"),
    )

    id: Mapped[uuid.UUID] = _id()
    token_hash: Mapped[bytes] = mapped_column(LargeBinary, nullable=False, unique=True)
    email: Mapped[str] = mapped_column(CITEXT, nullable=False)
    created_at: Mapped[datetime] = _now()
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class OAuthState(Base):
    """A Google sign-in in progress: its state, nonce and PKCE verifier, for 10 minutes."""

    __tablename__ = "oauth_states"
    __table_args__ = (CheckConstraint("octet_length(state_hash) = 32", name="state_hash_length"),)

    state_hash: Mapped[bytes] = mapped_column(LargeBinary, primary_key=True)
    nonce: Mapped[str] = mapped_column(Text, nullable=False)
    code_verifier: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = _now()
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )


class RejoinCode(Base):
    """A one-time personal code a teacher gives a student who lost their device. 24 hours."""

    __tablename__ = "rejoin_codes"
    __table_args__ = (
        CheckConstraint("octet_length(code_hash) = 32", name="code_hash_length"),
        # At most one unused code per student: issuing a new one replaces the old.
        Index(
            "uq_rejoin_codes_member_id_unused",
            "member_id",
            unique=True,
            postgresql_where=text("used_at IS NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = _id()
    member_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("class_members.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code_hash: Mapped[bytes] = mapped_column(LargeBinary, nullable=False, unique=True)
    created_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = _now()
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class RateLimit(Base):
    """A fixed-window counter, such as wrong class codes from one network address."""

    __tablename__ = "rate_limits"
    __table_args__ = (
        PrimaryKeyConstraint("key", "window_start"),
        CheckConstraint("hits >= 0", name="hits_not_negative"),
        CheckConstraint("char_length(key) <= 320", name="key_length"),
    )

    key: Mapped[str] = mapped_column(Text, nullable=False)
    window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    hits: Mapped[int] = mapped_column(Integer, nullable=False)


class Attempt(Base):
    """One attempt, held by one owner: a teacher or a class member (ADR 0039).

    `client_id` is the device's attempt id. It is unique per owner, not across owners, so a shared
    attempt file gives each account its own copy.
    """

    __tablename__ = "attempts"
    __table_args__ = (
        CheckConstraint("num_nonnulls(user_id, member_id) = 1", name="one_owner"),
        CheckConstraint("char_length(client_id) BETWEEN 1 AND 200", name="client_id_length"),
        CheckConstraint(
            "char_length(experiment_id) BETWEEN 1 AND 200", name="experiment_id_length"
        ),
        CheckConstraint("mode IN ('guided', 'exam', 'own-data')", name="mode_known"),
        CheckConstraint("seed >= 0 AND created_at_ms >= 0 AND updated_at_ms >= 0", name="whole"),
        # Lets each event carry its owner, checked against the attempt, for the pull query.
        UniqueConstraint("id", "owner_id"),
        Index(
            "uq_attempts_user_id_client_id",
            "user_id",
            "client_id",
            unique=True,
            postgresql_where=text("user_id IS NOT NULL"),
        ),
        Index(
            "uq_attempts_member_id_client_id",
            "member_id",
            "client_id",
            unique=True,
            postgresql_where=text("member_id IS NOT NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = _id()
    client_id: Mapped[str] = mapped_column(Text, nullable=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    # The partial unique indexes below also serve the cascades from users and class_members.
    member_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("class_members.id", ondelete="CASCADE")
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), Computed("coalesce(user_id, member_id)", persisted=True)
    )
    experiment_id: Mapped[str] = mapped_column(Text, nullable=False)
    mode: Mapped[str] = mapped_column(Text, nullable=False)
    seed: Mapped[int] = mapped_column(BigInteger, nullable=False)
    format_version: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at_ms: Mapped[int] = mapped_column(BigInteger, nullable=False)
    updated_at_ms: Mapped[int] = mapped_column(BigInteger, nullable=False)
    received_at: Mapped[datetime] = _now()


class AttemptEvent(Base):
    """One event of an attempt, as the device recorded it. `pos` is the pull cursor."""

    __tablename__ = "attempt_events"
    __table_args__ = (
        PrimaryKeyConstraint("attempt_id", "event_id"),
        ForeignKeyConstraint(
            ["attempt_id", "owner_id"], ["attempts.id", "attempts.owner_id"], ondelete="CASCADE"
        ),
        Index("ix_attempt_events_owner_id_pos", "owner_id", "pos"),
        # For the admin portal's charts (ADR 0040): only the kinds they read.
        Index(
            "ix_attempt_events_admin_kind_at_ms",
            "kind",
            "at_ms",
            postgresql_where=text("kind IN ('step.complete', 'coach.hint')"),
        ),
        CheckConstraint("char_length(event_id) BETWEEN 1 AND 200", name="event_id_length"),
        CheckConstraint("char_length(device) BETWEEN 1 AND 200", name="device_length"),
        CheckConstraint("char_length(kind) BETWEEN 1 AND 200", name="kind_length"),
        CheckConstraint("seq >= 1 AND at_ms >= 0", name="whole"),
    )

    attempt_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    event_id: Mapped[str] = mapped_column(Text, nullable=False)
    pos: Mapped[int] = mapped_column(BigInteger, Identity(always=True), nullable=False, unique=True)
    seq: Mapped[int] = mapped_column(BigInteger, nullable=False)
    device: Mapped[str] = mapped_column(Text, nullable=False)
    at_ms: Mapped[int] = mapped_column(BigInteger, nullable=False)
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    data: Mapped[Any] = mapped_column(JSONB, nullable=False)


STEP_NAMES = (
    "'question', 'predict', 'build', 'check', 'measure', "
    "'tabulate', 'plot', 'analyse', 'conclude', 'report'"
)


class LiveSession(Base):
    """A live class: a lesson in which the teacher sees every bench as it changes (ADR 0041).

    A class has at most one open live session. Its benches and messages are kept for 30 days after
    it ends, then removed with it.
    """

    __tablename__ = "live_sessions"
    __table_args__ = (
        CheckConstraint(
            "char_length(experiment_id) BETWEEN 1 AND 200", name="experiment_id_length"
        ),
        CheckConstraint("lesson_minutes BETWEEN 5 AND 240", name="lesson_minutes_range"),
        CheckConstraint("ended_at IS NULL OR ended_at >= started_at", name="ends_after_start"),
        Index(
            "uq_live_sessions_class_id_open",
            "class_id",
            unique=True,
            postgresql_where=text("ended_at IS NULL"),
        ),
        Index(
            "ix_live_sessions_ended_at", "ended_at", postgresql_where=text("ended_at IS NOT NULL")
        ),
    )

    id: Mapped[uuid.UUID] = _id()
    class_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    started_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    experiment_id: Mapped[str] = mapped_column(Text, nullable=False)
    lesson_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    steps_locked: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    started_at: Mapped[datetime] = _now()
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class LiveBench(Base):
    """What one student's bench shows the teacher in a live session: the latest summary their
    device sent. Derived from their attempt, which stays the record; this is only the view."""

    __tablename__ = "live_benches"
    __table_args__ = (
        PrimaryKeyConstraint("session_id", "member_id"),
        CheckConstraint(
            "attempt_id IS NULL OR char_length(attempt_id) BETWEEN 1 AND 200",
            name="attempt_id_length",
        ),
        CheckConstraint(f"step IN ({STEP_NAMES})", name="step_known"),
        CheckConstraint(f"completed <@ ARRAY[{STEP_NAMES}]::text[]", name="completed_known"),
        CheckConstraint("jsonb_typeof(mistakes) = 'array'", name="mistakes_array"),
        CheckConstraint("octet_length(mistakes::text) <= 4096", name="mistakes_small"),
        CheckConstraint("readings BETWEEN 0 AND 10000", name="readings_range"),
    )

    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_sessions.id", ondelete="CASCADE"), nullable=False
    )
    member_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("class_members.id", ondelete="CASCADE"), nullable=False, index=True
    )
    attempt_id: Mapped[str | None] = mapped_column(Text)
    step: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("'question'"))
    completed: Mapped[list[str]] = mapped_column(
        ARRAY(Text), nullable=False, server_default=text("'{}'::text[]")
    )
    mistakes: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    readings: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    joined_at: Mapped[datetime] = _now()
    updated_at: Mapped[datetime] = _now()
    last_seen_at: Mapped[datetime] = _now()
    measured_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class LiveMessage(Base):
    """Something the teacher sent in a live session: a hint push, a broadcast or a note.

    `to_member_ids` is who it was for, fixed when it was sent (NULL for everyone). Its `id` is
    the catch-up cursor: a student who reconnects gets the messages after the last one they saw.
    """

    __tablename__ = "live_messages"
    __table_args__ = (
        CheckConstraint("kind IN ('hint', 'broadcast', 'note')", name="kind_known"),
        CheckConstraint("jsonb_typeof(data) = 'object'", name="data_object"),
        CheckConstraint("octet_length(data::text) <= 2048", name="data_small"),
        CheckConstraint(
            "to_member_ids IS NULL OR cardinality(to_member_ids) <= 500", name="recipients_bounded"
        ),
        Index("ix_live_messages_session_id_id", "session_id", "id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(always=True), primary_key=True)
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("live_sessions.id", ondelete="CASCADE"), nullable=False
    )
    kind: Mapped[str] = mapped_column(Text, nullable=False)
    to_member_ids: Mapped[list[uuid.UUID] | None] = mapped_column(ARRAY(UUID(as_uuid=True)))
    data: Mapped[Any] = mapped_column(JSONB, nullable=False)
    sent_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_at: Mapped[datetime] = _now()
    undone_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AdminAudit(Base):
    """One staff action in the admin portal: who, what, on what, when (ADR 0040).

    Append-only: a trigger refuses every update, and refuses deletes until an entry is older than
    the retention period. `detail` never holds a student's name or anything typed by a student.
    No foreign keys, so the record outlives what it is about (a deleted class keeps its history).
    """

    __tablename__ = "admin_audit"
    __table_args__ = (
        CheckConstraint("char_length(actor_email) BETWEEN 3 AND 254", name="actor_email_length"),
        CheckConstraint("actor_via IN ('access', 'dev-bypass')", name="actor_via_known"),
        CheckConstraint("action ~ '^[a-z][a-z0-9.-]{2,63}$'", name="action_format"),
        CheckConstraint(
            "target_type IS NULL OR target_type ~ '^[a-z][a-z-]{1,31}$'", name="target_type_format"
        ),
        CheckConstraint("jsonb_typeof(detail) = 'object'", name="detail_is_object"),
        CheckConstraint("octet_length(detail::text) <= 4096", name="detail_size"),
        Index("ix_admin_audit_at_id", text("at DESC"), text("id DESC")),
        Index("ix_admin_audit_target_type_target_id", "target_type", "target_id"),
    )

    id: Mapped[uuid.UUID] = _id()
    at: Mapped[datetime] = _now()
    actor_email: Mapped[str] = mapped_column(CITEXT, nullable=False)
    actor_via: Mapped[str] = mapped_column(Text, nullable=False)
    action: Mapped[str] = mapped_column(Text, nullable=False)
    target_type: Mapped[str | None] = mapped_column(Text)
    target_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    detail: Mapped[Any] = mapped_column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))


class Consent(Base):
    """One thing a person agreed to, or withdrew, and which version of the document (ADR 0042).

    Append-only: a new decision is a new row, and the latest row for a person and purpose is the
    one in force. A student's consent is recorded against their class membership, with nothing
    else about them. Deleting the person deletes their consents.
    """

    __tablename__ = "consents"
    __table_args__ = (
        CheckConstraint("num_nonnulls(user_id, member_id) = 1", name="one_person"),
        CheckConstraint("purpose IN ('terms', 'privacy', 'analytics')", name="purpose_known"),
        CheckConstraint("char_length(version) BETWEEN 1 AND 40", name="version_length"),
        CheckConstraint("via IN ('sign-in', 'join', 'choice')", name="via_known"),
        # Students are never asked about analytics, and the database holds to it.
        CheckConstraint("member_id IS NULL OR purpose <> 'analytics'", name="no_student_analytics"),
        # The required documents are agreed to; they are withdrawn only by deleting the account.
        CheckConstraint("granted OR purpose = 'analytics'", name="required_only_granted"),
        Index(
            "ix_consents_user_id_purpose_recorded_at",
            "user_id",
            "purpose",
            "recorded_at",
            postgresql_where=text("user_id IS NOT NULL"),
        ),
        Index(
            "ix_consents_member_id_purpose_recorded_at",
            "member_id",
            "purpose",
            "recorded_at",
            postgresql_where=text("member_id IS NOT NULL"),
        ),
    )

    id: Mapped[uuid.UUID] = _id()
    # The partial indexes above also serve the cascades from users and class_members.
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    member_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("class_members.id", ondelete="CASCADE")
    )
    purpose: Mapped[str] = mapped_column(Text, nullable=False)
    version: Mapped[str] = mapped_column(Text, nullable=False)
    granted: Mapped[bool] = mapped_column(Boolean, nullable=False)
    via: Mapped[str] = mapped_column(Text, nullable=False)
    recorded_at: Mapped[datetime] = _now()


class AiRequest(Base):
    """One AI request: what it cost and how it ended, never what was asked or answered (ADR 0043).

    The person is a pseudonym, a keyed hash of their id, so the log cannot be read back to a
    person without the key, and no foreign key ties it to them. Rows are kept for
    AI_LOG_RETENTION (app/ai/log.py), then deleted.
    """

    __tablename__ = "ai_requests"
    __table_args__ = (
        CheckConstraint(
            "feature IN ('tutor', 'what-if', 'report-review', 'question-drafting')",
            name="feature_known",
        ),
        CheckConstraint("char_length(model) BETWEEN 1 AND 64", name="model_length"),
        CheckConstraint("principal_kind IN ('teacher', 'student')", name="principal_kind_known"),
        CheckConstraint("octet_length(pseudonym) = 32", name="pseudonym_length"),
        CheckConstraint(
            "outcome IN ('done', 'cut-short', 'refused', 'held', 'error', 'cancelled')",
            name="outcome_known",
        ),
        CheckConstraint(
            "input_tokens >= 0 AND output_tokens >= 0 AND cache_read_tokens >= 0"
            " AND cache_write_tokens >= 0 AND duration_ms >= 0",
            name="counts_not_negative",
        ),
        Index("ix_ai_requests_at", "at"),
        Index("ix_ai_requests_pseudonym_at", "pseudonym", "at"),
    )

    id: Mapped[uuid.UUID] = _id()
    at: Mapped[datetime] = _now()
    feature: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str] = mapped_column(Text, nullable=False)
    principal_kind: Mapped[str] = mapped_column(Text, nullable=False)
    pseudonym: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    input_tokens: Mapped[int] = mapped_column(Integer, nullable=False)
    output_tokens: Mapped[int] = mapped_column(Integer, nullable=False)
    cache_read_tokens: Mapped[int] = mapped_column(Integer, nullable=False)
    cache_write_tokens: Mapped[int] = mapped_column(Integer, nullable=False)
    # Millionths of a US dollar; null when the model's price is not known.
    cost_microdollars: Mapped[int | None] = mapped_column(BigInteger)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    outcome: Mapped[str] = mapped_column(Text, nullable=False)

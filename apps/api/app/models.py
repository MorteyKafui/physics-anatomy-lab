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
from sqlalchemy.dialects.postgresql import CITEXT, JSONB, UUID
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

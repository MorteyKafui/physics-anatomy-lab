"""Database tables for accounts and classes (ADR 0038).

Students are class members, not users: a member is a display name in one class and nothing else.
Every secret (session token, sign-in link, re-join code) is stored only as its SHA-256 hash.
"""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    MetaData,
    PrimaryKeyConstraint,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import CITEXT, UUID
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
    __table_args__ = (CheckConstraint("octet_length(token_hash) = 32", name="token_hash_length"),)

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
    __table_args__ = (CheckConstraint("octet_length(code_hash) = 32", name="code_hash_length"),)

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
    )

    key: Mapped[str] = mapped_column(Text, nullable=False)
    window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    hits: Mapped[int] = mapped_column(Integer, nullable=False)

"""Teachers, classes, class members, sessions and one-time codes (ADR 0038).

New tables only, so it takes no locks on existing data. The downgrade drops them all; the citext
extension is left in place, as other database objects may use it.

Revision ID: 0001
Revises:
Create Date: 2026-11-18 18:55:13.507079
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS citext")
    op.create_table(
        "email_link_tokens",
        sa.Column("id", sa.UUID(), server_default=sa.text("uuidv7()"), nullable=False),
        sa.Column("token_hash", sa.LargeBinary(), nullable=False),
        sa.Column("email", postgresql.CITEXT(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "char_length(email) BETWEEN 3 AND 254", name=op.f("ck_email_link_tokens_email_length")
        ),
        sa.CheckConstraint(
            "octet_length(token_hash) = 32", name=op.f("ck_email_link_tokens_token_hash_length")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_email_link_tokens")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_email_link_tokens_token_hash")),
    )
    op.create_index(
        op.f("ix_email_link_tokens_expires_at"), "email_link_tokens", ["expires_at"], unique=False
    )
    op.create_table(
        "oauth_states",
        sa.Column("state_hash", sa.LargeBinary(), nullable=False),
        sa.Column("nonce", sa.Text(), nullable=False),
        sa.Column("code_verifier", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "octet_length(state_hash) = 32", name=op.f("ck_oauth_states_state_hash_length")
        ),
        sa.PrimaryKeyConstraint("state_hash", name=op.f("pk_oauth_states")),
    )
    op.create_index(
        op.f("ix_oauth_states_expires_at"), "oauth_states", ["expires_at"], unique=False
    )
    op.create_table(
        "rate_limits",
        sa.Column("key", sa.Text(), nullable=False),
        sa.Column("window_start", sa.DateTime(timezone=True), nullable=False),
        sa.Column("hits", sa.Integer(), nullable=False),
        sa.CheckConstraint("hits >= 0", name=op.f("ck_rate_limits_hits_not_negative")),
        sa.CheckConstraint("char_length(key) <= 320", name=op.f("ck_rate_limits_key_length")),
        sa.PrimaryKeyConstraint("key", "window_start", name=op.f("pk_rate_limits")),
    )
    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), server_default=sa.text("uuidv7()"), nullable=False),
        sa.Column("email", postgresql.CITEXT(), nullable=False),
        sa.Column("display_name", sa.Text(), nullable=True),
        sa.Column("google_sub", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("last_signed_in_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "char_length(email) BETWEEN 3 AND 254", name=op.f("ck_users_email_length")
        ),
        sa.CheckConstraint(
            "display_name IS NULL OR char_length(display_name) BETWEEN 1 AND 80",
            name=op.f("ck_users_display_name_length"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("email", name=op.f("uq_users_email")),
        sa.UniqueConstraint("google_sub", name=op.f("uq_users_google_sub")),
    )
    op.create_table(
        "classes",
        sa.Column("id", sa.UUID(), server_default=sa.text("uuidv7()"), nullable=False),
        sa.Column("teacher_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("code", sa.Text(), nullable=False),
        sa.Column("joining_open", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("ai_enabled", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("school_permission_confirmed_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "code_changed_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("code ~ '^[A-HJKMNP-Z2-9]{6}$'", name=op.f("ck_classes_code_format")),
        sa.CheckConstraint(
            "char_length(name) BETWEEN 1 AND 80", name=op.f("ck_classes_name_length")
        ),
        sa.ForeignKeyConstraint(
            ["teacher_id"],
            ["users.id"],
            name=op.f("fk_classes_teacher_id_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_classes")),
        sa.UniqueConstraint("code", name=op.f("uq_classes_code")),
    )
    op.create_index(op.f("ix_classes_teacher_id"), "classes", ["teacher_id"], unique=False)
    op.create_table(
        "class_members",
        sa.Column("id", sa.UUID(), server_default=sa.text("uuidv7()"), nullable=False),
        sa.Column("class_id", sa.UUID(), nullable=False),
        sa.Column("display_name", postgresql.CITEXT(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "char_length(display_name) BETWEEN 2 AND 24",
            name=op.f("ck_class_members_display_name_length"),
        ),
        sa.ForeignKeyConstraint(
            ["class_id"],
            ["classes.id"],
            name=op.f("fk_class_members_class_id_classes"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_class_members")),
        sa.UniqueConstraint(
            "class_id", "display_name", name=op.f("uq_class_members_class_id_display_name")
        ),
    )
    op.create_table(
        "rejoin_codes",
        sa.Column("id", sa.UUID(), server_default=sa.text("uuidv7()"), nullable=False),
        sa.Column("member_id", sa.UUID(), nullable=False),
        sa.Column("code_hash", sa.LargeBinary(), nullable=False),
        sa.Column("created_by", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "octet_length(code_hash) = 32", name=op.f("ck_rejoin_codes_code_hash_length")
        ),
        sa.ForeignKeyConstraint(
            ["created_by"],
            ["users.id"],
            name=op.f("fk_rejoin_codes_created_by_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["member_id"],
            ["class_members.id"],
            name=op.f("fk_rejoin_codes_member_id_class_members"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_rejoin_codes")),
        sa.UniqueConstraint("code_hash", name=op.f("uq_rejoin_codes_code_hash")),
    )
    op.create_index(
        op.f("ix_rejoin_codes_created_by"), "rejoin_codes", ["created_by"], unique=False
    )
    op.create_index(op.f("ix_rejoin_codes_member_id"), "rejoin_codes", ["member_id"], unique=False)
    op.create_index(
        "uq_rejoin_codes_member_id_unused",
        "rejoin_codes",
        ["member_id"],
        unique=True,
        postgresql_where=sa.text("used_at IS NULL"),
    )
    op.create_table(
        "sessions",
        sa.Column("id", sa.UUID(), server_default=sa.text("uuidv7()"), nullable=False),
        sa.Column("token_hash", sa.LargeBinary(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("member_id", sa.UUID(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "last_used_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("idle_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint(
            "idle_expires_at <= expires_at", name=op.f("ck_sessions_idle_within_absolute")
        ),
        sa.CheckConstraint(
            "num_nonnulls(user_id, member_id) = 1", name=op.f("ck_sessions_one_principal")
        ),
        sa.CheckConstraint(
            "octet_length(token_hash) = 32", name=op.f("ck_sessions_token_hash_length")
        ),
        sa.ForeignKeyConstraint(
            ["member_id"],
            ["class_members.id"],
            name=op.f("fk_sessions_member_id_class_members"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_sessions_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_sessions")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_sessions_token_hash")),
    )
    op.create_index(op.f("ix_sessions_expires_at"), "sessions", ["expires_at"], unique=False)
    op.create_index(op.f("ix_sessions_member_id"), "sessions", ["member_id"], unique=False)
    op.create_index(op.f("ix_sessions_user_id"), "sessions", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_sessions_user_id"), table_name="sessions")
    op.drop_index(op.f("ix_sessions_member_id"), table_name="sessions")
    op.drop_index(op.f("ix_sessions_expires_at"), table_name="sessions")
    op.drop_table("sessions")
    op.drop_index("uq_rejoin_codes_member_id_unused", table_name="rejoin_codes")
    op.drop_index(op.f("ix_rejoin_codes_member_id"), table_name="rejoin_codes")
    op.drop_index(op.f("ix_rejoin_codes_created_by"), table_name="rejoin_codes")
    op.drop_table("rejoin_codes")
    op.drop_table("class_members")
    op.drop_index(op.f("ix_classes_teacher_id"), table_name="classes")
    op.drop_table("classes")
    op.drop_table("users")
    op.drop_table("rate_limits")
    op.drop_index(op.f("ix_oauth_states_expires_at"), table_name="oauth_states")
    op.drop_table("oauth_states")
    op.drop_index(op.f("ix_email_link_tokens_expires_at"), table_name="email_link_tokens")
    op.drop_table("email_link_tokens")

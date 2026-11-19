"""Live classes: live sessions, their benches and the teacher's messages (ADR 0041).

New tables only, so it takes no locks on existing data; the downgrade drops them.

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-18 20:55:45.902567
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# Written out, not imported, so the migration never changes when the app does.
STEPS = (
    "'question', 'predict', 'build', 'check', 'measure', "
    "'tabulate', 'plot', 'analyse', 'conclude', 'report'"
)


def upgrade() -> None:
    op.create_table(
        "live_sessions",
        sa.Column("id", sa.UUID(), server_default=sa.text("uuidv7()"), nullable=False),
        sa.Column("class_id", sa.UUID(), nullable=False),
        sa.Column("started_by", sa.UUID(), nullable=False),
        sa.Column("experiment_id", sa.Text(), nullable=False),
        sa.Column("lesson_minutes", sa.Integer(), nullable=False),
        sa.Column("steps_locked", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column(
            "started_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "char_length(experiment_id) BETWEEN 1 AND 200",
            name=op.f("ck_live_sessions_experiment_id_length"),
        ),
        sa.CheckConstraint(
            "ended_at IS NULL OR ended_at >= started_at",
            name=op.f("ck_live_sessions_ends_after_start"),
        ),
        sa.CheckConstraint(
            "lesson_minutes BETWEEN 5 AND 240", name=op.f("ck_live_sessions_lesson_minutes_range")
        ),
        sa.ForeignKeyConstraint(
            ["class_id"],
            ["classes.id"],
            name=op.f("fk_live_sessions_class_id_classes"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["started_by"],
            ["users.id"],
            name=op.f("fk_live_sessions_started_by_users"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_live_sessions")),
    )
    op.create_index(op.f("ix_live_sessions_class_id"), "live_sessions", ["class_id"], unique=False)
    op.create_index(
        "ix_live_sessions_ended_at",
        "live_sessions",
        ["ended_at"],
        unique=False,
        postgresql_where=sa.text("ended_at IS NOT NULL"),
    )
    op.create_index(
        op.f("ix_live_sessions_started_by"), "live_sessions", ["started_by"], unique=False
    )
    op.create_index(
        "uq_live_sessions_class_id_open",
        "live_sessions",
        ["class_id"],
        unique=True,
        postgresql_where=sa.text("ended_at IS NULL"),
    )
    op.create_table(
        "live_benches",
        sa.Column("session_id", sa.UUID(), nullable=False),
        sa.Column("member_id", sa.UUID(), nullable=False),
        sa.Column("attempt_id", sa.Text(), nullable=True),
        sa.Column("step", sa.Text(), server_default=sa.text("'question'"), nullable=False),
        sa.Column(
            "completed",
            postgresql.ARRAY(sa.Text()),
            server_default=sa.text("'{}'::text[]"),
            nullable=False,
        ),
        sa.Column(
            "mistakes",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'[]'::jsonb"),
            nullable=False,
        ),
        sa.Column("readings", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column(
            "joined_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "last_seen_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("measured_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            f"completed <@ ARRAY[{STEPS}]::text[]",
            name=op.f("ck_live_benches_completed_known"),
        ),
        sa.CheckConstraint(
            "jsonb_typeof(mistakes) = 'array'", name=op.f("ck_live_benches_mistakes_array")
        ),
        sa.CheckConstraint(
            f"step IN ({STEPS})",
            name=op.f("ck_live_benches_step_known"),
        ),
        sa.CheckConstraint(
            "attempt_id IS NULL OR char_length(attempt_id) BETWEEN 1 AND 200",
            name=op.f("ck_live_benches_attempt_id_length"),
        ),
        sa.CheckConstraint(
            "octet_length(mistakes::text) <= 4096", name=op.f("ck_live_benches_mistakes_small")
        ),
        sa.CheckConstraint(
            "readings BETWEEN 0 AND 10000", name=op.f("ck_live_benches_readings_range")
        ),
        sa.ForeignKeyConstraint(
            ["member_id"],
            ["class_members.id"],
            name=op.f("fk_live_benches_member_id_class_members"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["session_id"],
            ["live_sessions.id"],
            name=op.f("fk_live_benches_session_id_live_sessions"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("session_id", "member_id", name=op.f("pk_live_benches")),
    )
    op.create_index(op.f("ix_live_benches_member_id"), "live_benches", ["member_id"], unique=False)
    op.create_table(
        "live_messages",
        sa.Column("id", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("session_id", sa.UUID(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("to_member_ids", postgresql.ARRAY(sa.UUID()), nullable=True),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("sent_by", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("undone_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "jsonb_typeof(data) = 'object'", name=op.f("ck_live_messages_data_object")
        ),
        sa.CheckConstraint(
            "kind IN ('hint', 'broadcast', 'note')", name=op.f("ck_live_messages_kind_known")
        ),
        sa.CheckConstraint(
            "octet_length(data::text) <= 2048", name=op.f("ck_live_messages_data_small")
        ),
        sa.CheckConstraint(
            "to_member_ids IS NULL OR cardinality(to_member_ids) <= 500",
            name=op.f("ck_live_messages_recipients_bounded"),
        ),
        sa.ForeignKeyConstraint(
            ["sent_by"],
            ["users.id"],
            name=op.f("fk_live_messages_sent_by_users"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["session_id"],
            ["live_sessions.id"],
            name=op.f("fk_live_messages_session_id_live_sessions"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_live_messages")),
    )
    op.create_index(op.f("ix_live_messages_sent_by"), "live_messages", ["sent_by"], unique=False)
    op.create_index(
        "ix_live_messages_session_id_id", "live_messages", ["session_id", "id"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_live_messages_session_id_id", table_name="live_messages")
    op.drop_index(op.f("ix_live_messages_sent_by"), table_name="live_messages")
    op.drop_table("live_messages")
    op.drop_index(op.f("ix_live_benches_member_id"), table_name="live_benches")
    op.drop_table("live_benches")
    op.drop_index(
        "uq_live_sessions_class_id_open",
        table_name="live_sessions",
        postgresql_where=sa.text("ended_at IS NULL"),
    )
    op.drop_index(op.f("ix_live_sessions_started_by"), table_name="live_sessions")
    op.drop_index(
        "ix_live_sessions_ended_at",
        table_name="live_sessions",
        postgresql_where=sa.text("ended_at IS NOT NULL"),
    )
    op.drop_index(op.f("ix_live_sessions_class_id"), table_name="live_sessions")
    op.drop_table("live_sessions")

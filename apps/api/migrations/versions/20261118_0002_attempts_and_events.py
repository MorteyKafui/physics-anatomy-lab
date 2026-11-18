"""Attempts and their events, for sync (ADR 0039).

New tables only, so it takes no locks on existing data; the downgrade drops them.

Revision ID: 0002
Revises: 0001
Create Date: 2026-11-18 19:54:07.333616
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "attempts",
        sa.Column("id", sa.UUID(), server_default=sa.text("uuidv7()"), nullable=False),
        sa.Column("client_id", sa.Text(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("member_id", sa.UUID(), nullable=True),
        sa.Column(
            "owner_id",
            sa.UUID(),
            sa.Computed("coalesce(user_id, member_id)", persisted=True),
            nullable=False,
        ),
        sa.Column("experiment_id", sa.Text(), nullable=False),
        sa.Column("mode", sa.Text(), nullable=False),
        sa.Column("seed", sa.BigInteger(), nullable=False),
        sa.Column("format_version", sa.Integer(), nullable=False),
        sa.Column("created_at_ms", sa.BigInteger(), nullable=False),
        sa.Column("updated_at_ms", sa.BigInteger(), nullable=False),
        sa.Column(
            "received_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "mode IN ('guided', 'exam', 'own-data')", name=op.f("ck_attempts_mode_known")
        ),
        sa.CheckConstraint(
            "char_length(client_id) BETWEEN 1 AND 200", name=op.f("ck_attempts_client_id_length")
        ),
        sa.CheckConstraint(
            "char_length(experiment_id) BETWEEN 1 AND 200",
            name=op.f("ck_attempts_experiment_id_length"),
        ),
        sa.CheckConstraint(
            "num_nonnulls(user_id, member_id) = 1", name=op.f("ck_attempts_one_owner")
        ),
        sa.CheckConstraint(
            "seed >= 0 AND created_at_ms >= 0 AND updated_at_ms >= 0",
            name=op.f("ck_attempts_whole"),
        ),
        sa.ForeignKeyConstraint(
            ["member_id"],
            ["class_members.id"],
            name=op.f("fk_attempts_member_id_class_members"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_attempts_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_attempts")),
        sa.UniqueConstraint("id", "owner_id", name=op.f("uq_attempts_id_owner_id")),
    )
    op.create_index(
        "uq_attempts_member_id_client_id",
        "attempts",
        ["member_id", "client_id"],
        unique=True,
        postgresql_where=sa.text("member_id IS NOT NULL"),
    )
    op.create_index(
        "uq_attempts_user_id_client_id",
        "attempts",
        ["user_id", "client_id"],
        unique=True,
        postgresql_where=sa.text("user_id IS NOT NULL"),
    )
    op.create_table(
        "attempt_events",
        sa.Column("attempt_id", sa.UUID(), nullable=False),
        sa.Column("owner_id", sa.UUID(), nullable=False),
        sa.Column("event_id", sa.Text(), nullable=False),
        sa.Column("pos", sa.BigInteger(), sa.Identity(always=True), nullable=False),
        sa.Column("seq", sa.BigInteger(), nullable=False),
        sa.Column("device", sa.Text(), nullable=False),
        sa.Column("at_ms", sa.BigInteger(), nullable=False),
        sa.Column("kind", sa.Text(), nullable=False),
        sa.Column("data", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.CheckConstraint(
            "char_length(device) BETWEEN 1 AND 200", name=op.f("ck_attempt_events_device_length")
        ),
        sa.CheckConstraint(
            "char_length(event_id) BETWEEN 1 AND 200",
            name=op.f("ck_attempt_events_event_id_length"),
        ),
        sa.CheckConstraint(
            "char_length(kind) BETWEEN 1 AND 200", name=op.f("ck_attempt_events_kind_length")
        ),
        sa.CheckConstraint("seq >= 1 AND at_ms >= 0", name=op.f("ck_attempt_events_whole")),
        sa.ForeignKeyConstraint(
            ["attempt_id", "owner_id"],
            ["attempts.id", "attempts.owner_id"],
            name=op.f("fk_attempt_events_attempt_id_attempts"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("attempt_id", "event_id", name=op.f("pk_attempt_events")),
        sa.UniqueConstraint("pos", name=op.f("uq_attempt_events_pos")),
    )
    op.create_index(
        "ix_attempt_events_owner_id_pos", "attempt_events", ["owner_id", "pos"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_attempt_events_owner_id_pos", table_name="attempt_events")
    op.drop_table("attempt_events")
    op.drop_index(
        "uq_attempts_user_id_client_id",
        table_name="attempts",
        postgresql_where=sa.text("user_id IS NOT NULL"),
    )
    op.drop_index(
        "uq_attempts_member_id_client_id",
        table_name="attempts",
        postgresql_where=sa.text("member_id IS NOT NULL"),
    )
    op.drop_table("attempts")

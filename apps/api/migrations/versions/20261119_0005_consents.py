"""Consent records (ADR 0042).

A new table only, so it takes no locks on existing data; the downgrade drops it.

Revision ID: 0005
Revises: 0004
Create Date: 2026-11-19 09:00:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "consents",
        sa.Column("id", sa.UUID(), server_default=sa.text("uuidv7()"), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=True),
        sa.Column("member_id", sa.UUID(), nullable=True),
        sa.Column("purpose", sa.Text(), nullable=False),
        sa.Column("version", sa.Text(), nullable=False),
        sa.Column("granted", sa.Boolean(), nullable=False),
        sa.Column("via", sa.Text(), nullable=False),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "num_nonnulls(user_id, member_id) = 1", name=op.f("ck_consents_one_person")
        ),
        sa.CheckConstraint(
            "purpose IN ('terms', 'privacy', 'analytics')", name=op.f("ck_consents_purpose_known")
        ),
        sa.CheckConstraint(
            "char_length(version) BETWEEN 1 AND 40", name=op.f("ck_consents_version_length")
        ),
        sa.CheckConstraint(
            "via IN ('sign-in', 'join', 'choice')", name=op.f("ck_consents_via_known")
        ),
        sa.CheckConstraint(
            "member_id IS NULL OR purpose <> 'analytics'",
            name=op.f("ck_consents_no_student_analytics"),
        ),
        sa.CheckConstraint(
            "granted OR purpose = 'analytics'", name=op.f("ck_consents_required_only_granted")
        ),
        sa.ForeignKeyConstraint(
            ["member_id"],
            ["class_members.id"],
            name=op.f("fk_consents_member_id_class_members"),
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], name=op.f("fk_consents_user_id_users"), ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_consents")),
    )
    op.create_index(
        "ix_consents_member_id_purpose_recorded_at",
        "consents",
        ["member_id", "purpose", "recorded_at"],
        unique=False,
        postgresql_where=sa.text("member_id IS NOT NULL"),
    )
    op.create_index(
        "ix_consents_user_id_purpose_recorded_at",
        "consents",
        ["user_id", "purpose", "recorded_at"],
        unique=False,
        postgresql_where=sa.text("user_id IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index(
        "ix_consents_user_id_purpose_recorded_at",
        table_name="consents",
        postgresql_where=sa.text("user_id IS NOT NULL"),
    )
    op.drop_index(
        "ix_consents_member_id_purpose_recorded_at",
        table_name="consents",
        postgresql_where=sa.text("member_id IS NOT NULL"),
    )
    op.drop_table("consents")

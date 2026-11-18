"""The admin audit log, and an index for the admin portal's charts (ADR 0040).

`admin_audit` is new, so creating it locks nothing. A trigger keeps it append-only: updates are
refused, and deletes are refused until an entry is two years old (the retention period).

The index on `attempt_events` covers only the two kinds the charts read (step completions and
hints). It is built CONCURRENTLY, outside the migration's transaction, so syncing devices are not
blocked while it builds. The downgrade drops both.

Revision ID: 0003
Revises: 0002
Create Date: 2026-11-18 22:10:00
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "admin_audit",
        sa.Column("id", sa.UUID(), server_default=sa.text("uuidv7()"), nullable=False),
        sa.Column(
            "at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column("actor_email", postgresql.CITEXT(), nullable=False),
        sa.Column("actor_via", sa.Text(), nullable=False),
        sa.Column("action", sa.Text(), nullable=False),
        sa.Column("target_type", sa.Text(), nullable=True),
        sa.Column("target_id", sa.UUID(), nullable=True),
        sa.Column(
            "detail",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "char_length(actor_email) BETWEEN 3 AND 254",
            name=op.f("ck_admin_audit_actor_email_length"),
        ),
        sa.CheckConstraint(
            "actor_via IN ('access', 'dev-bypass')", name=op.f("ck_admin_audit_actor_via_known")
        ),
        sa.CheckConstraint(
            "action ~ '^[a-z][a-z0-9.-]{2,63}$'", name=op.f("ck_admin_audit_action_format")
        ),
        sa.CheckConstraint(
            "target_type IS NULL OR target_type ~ '^[a-z][a-z-]{1,31}$'",
            name=op.f("ck_admin_audit_target_type_format"),
        ),
        sa.CheckConstraint(
            "jsonb_typeof(detail) = 'object'", name=op.f("ck_admin_audit_detail_is_object")
        ),
        sa.CheckConstraint(
            "octet_length(detail::text) <= 4096", name=op.f("ck_admin_audit_detail_size")
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_admin_audit")),
    )
    op.create_index("ix_admin_audit_at_id", "admin_audit", [sa.text("at DESC"), sa.text("id DESC")])
    op.create_index(
        "ix_admin_audit_target_type_target_id", "admin_audit", ["target_type", "target_id"]
    )
    op.execute(
        """
        CREATE FUNCTION admin_audit_append_only() RETURNS trigger
        LANGUAGE plpgsql AS $$
        BEGIN
            IF TG_OP = 'UPDATE' THEN
                RAISE EXCEPTION 'admin_audit is append-only';
            END IF;
            IF OLD.at > now() - interval '2 years' THEN
                RAISE EXCEPTION 'admin_audit entries are kept for two years';
            END IF;
            RETURN OLD;
        END
        $$
        """
    )
    op.execute(
        """
        CREATE TRIGGER admin_audit_append_only
        BEFORE UPDATE OR DELETE ON admin_audit
        FOR EACH ROW EXECUTE FUNCTION admin_audit_append_only()
        """
    )
    with op.get_context().autocommit_block():
        op.create_index(
            "ix_attempt_events_admin_kind_at_ms",
            "attempt_events",
            ["kind", "at_ms"],
            postgresql_where=sa.text("kind IN ('step.complete', 'coach.hint')"),
            postgresql_concurrently=True,
            if_not_exists=True,
        )


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.drop_index(
            "ix_attempt_events_admin_kind_at_ms",
            table_name="attempt_events",
            postgresql_concurrently=True,
            if_exists=True,
        )
    op.execute("DROP TRIGGER admin_audit_append_only ON admin_audit")
    op.execute("DROP FUNCTION admin_audit_append_only()")
    op.drop_index("ix_admin_audit_target_type_target_id", table_name="admin_audit")
    op.drop_index("ix_admin_audit_at_id", table_name="admin_audit")
    op.drop_table("admin_audit")

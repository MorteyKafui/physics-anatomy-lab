"""Writing the admin audit log (ADR 0040).

Every admin call that changes something, or sends data out (an export), calls `record` in the same
transaction as the change: the change and its audit entry commit together or not at all.
"""

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.admin.access import Staff
from app.models import AdminAudit

# How long entries are kept. The database refuses to delete younger ones (migration 0003).
RETENTION_YEARS = 2


async def record(
    db: AsyncSession,
    staff: Staff,
    action: str,
    target_type: str | None = None,
    target_id: uuid.UUID | None = None,
    detail: dict[str, Any] | None = None,
) -> AdminAudit:
    entry = AdminAudit(
        actor_email=staff.email,
        actor_via=staff.via,
        action=action,
        target_type=target_type,
        target_id=target_id,
        detail=detail or {},
    )
    db.add(entry)
    await db.flush()
    return entry

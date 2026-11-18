"""The migrations match the models, and the committed OpenAPI file matches the API."""

import json
from pathlib import Path

from alembic.autogenerate import compare_metadata
from alembic.migration import MigrationContext
from sqlalchemy import Connection
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.models import Base

OPENAPI_FILE = Path(__file__).parents[3] / "packages" / "api-client" / "openapi.json"


async def test_migrations_match_the_models(db: AsyncSession) -> None:
    def differences(connection: Connection) -> list[object]:
        context = MigrationContext.configure(connection, opts={"compare_type": True})
        return list(compare_metadata(context, Base.metadata))

    connection = await db.connection()
    assert await connection.run_sync(differences) == []


def test_the_typescript_client_is_up_to_date() -> None:
    """If this fails, run `uv run python -m scripts.export_openapi` and regenerate the client."""
    committed = json.loads(OPENAPI_FILE.read_text(encoding="utf-8"))
    assert committed == app.openapi()

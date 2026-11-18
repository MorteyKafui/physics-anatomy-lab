"""Tests run against PostgreSQL (the test database), each inside a transaction that is rolled back.

The schema is built by the migrations themselves: down to nothing, then up to head, once per run.
"""

import os

os.environ["ENVIRONMENT"] = "test"

from collections.abc import AsyncIterator, Iterator

import pytest
from alembic import command
from alembic.config import Config
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.auth.email import LogSender, get_email_sender
from app.config import get_settings
from app.db import get_db
from app.main import app

ORIGIN = get_settings().web_origin
BASE_URL = "http://testserver"


def alembic_config() -> Config:
    return Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))


@pytest.fixture(scope="session", autouse=True)
def schema() -> Iterator[None]:
    config = alembic_config()
    command.downgrade(config, "base")
    command.upgrade(config, "head")
    yield


@pytest.fixture
async def db() -> AsyncIterator[AsyncSession]:
    engine = create_async_engine(get_settings().database_url, poolclass=NullPool)
    async with engine.connect() as connection:
        outer = await connection.begin()
        session = AsyncSession(
            bind=connection, expire_on_commit=False, join_transaction_mode="create_savepoint"
        )

        async def test_db() -> AsyncIterator[AsyncSession]:
            try:
                yield session
                await session.commit()
            except BaseException:
                await session.rollback()
                raise

        app.dependency_overrides[get_db] = test_db
        try:
            yield session
        finally:
            app.dependency_overrides.pop(get_db, None)
            await session.close()
            await outer.rollback()
    await engine.dispose()


@pytest.fixture
def outbox() -> Iterator[LogSender]:
    sender = LogSender()
    app.dependency_overrides[get_email_sender] = lambda: sender
    yield sender
    app.dependency_overrides.pop(get_email_sender, None)


def browser() -> AsyncClient:
    """One browser: keeps its own cookies and sends the web app's Origin."""
    return AsyncClient(
        transport=ASGITransport(app=app), base_url=BASE_URL, headers={"Origin": ORIGIN}
    )


@pytest.fixture
async def client(db: AsyncSession) -> AsyncIterator[AsyncClient]:
    async with browser() as c:
        yield c

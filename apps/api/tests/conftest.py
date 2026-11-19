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
from pydantic import SecretStr
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.pool import NullPool

from app.ai.answers import get_answer_store
from app.ai.claude import get_claude
from app.ai.log import get_ai_log
from app.auth.email import LogSender, get_email_sender
from app.config import get_settings
from app.db import get_db
from app.main import app
from tests.ai_fakes import TEST_KEY, FakeAnswers, FakeClaude, FakeLog

ORIGIN = get_settings().web_origin
BASE_URL = "http://testserver"


def alembic_config() -> Config:
    return Config(os.path.join(os.path.dirname(__file__), "..", "alembic.ini"))


@pytest.fixture(scope="session", autouse=True)
def schema() -> Iterator[None]:
    database = get_settings().database_url.rsplit("/", 1)[-1].split("?")[0]
    if not database.endswith("_test"):
        pytest.exit(
            f"Tests drop every table: point DATABASE_URL at a *_test database, not {database}."
        )
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


# AI (ADR 0043): a fake Claude and log, so no test calls the SDK or needs a key.


@pytest.fixture
def ai_on(monkeypatch: pytest.MonkeyPatch) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "ai_enabled", True)
    monkeypatch.setattr(settings, "anthropic_api_key", SecretStr(TEST_KEY))


@pytest.fixture
def claude() -> Iterator[FakeClaude]:
    fake = FakeClaude()
    fake.reply("Start counting at ", "zero.")
    app.dependency_overrides[get_claude] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_claude, None)


@pytest.fixture
def ai_log(db: AsyncSession) -> Iterator[FakeLog]:
    fake = FakeLog(db=db)
    app.dependency_overrides[get_ai_log] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_ai_log, None)


@pytest.fixture(autouse=True)
def answers() -> Iterator[FakeAnswers]:
    """Every test gets an empty answer cache of its own (the real one is tested on its own)."""
    fake = FakeAnswers()
    app.dependency_overrides[get_answer_store] = lambda: fake
    yield fake
    app.dependency_overrides.pop(get_answer_store, None)

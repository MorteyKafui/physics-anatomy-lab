"""The Physics Anatomy API: accounts, classes, sync, live classes and AI.

With ACCOUNTS_ENABLED off (the default, ADR 0047) only the admin API, the exam's approved
questions and the health check answer; the rest is switched off by app/accounts.py.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRoute
from pydantic import BaseModel

from app.accounts import AccountsSwitch
from app.auth.origin import OriginGuard
from app.auth.policy import MAX_BODY_BYTES
from app.body_limit import BodyLimit
from app.config import get_settings
from app.db import get_engine
from app.live.hub import Hub, listen_dsn
from app.routes import admin, ai, auth, classes, live, load_test, privacy, questions, sync, teacher
from app.security_headers import SecurityHeaders

settings = get_settings()


def operation_id(route: APIRoute) -> str:
    """Name each operation after its handler, so the TypeScript client reads well."""
    head, *rest = route.name.split("_")
    return head + "".join(word.capitalize() for word in rest)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    """Each container listens for live-class messages for as long as it runs (ADR 0041)."""
    hub = Hub(listen_dsn(settings.database_url))
    app.state.hub = hub
    await hub.start()
    try:
        yield
    finally:
        await hub.stop()
        await get_engine().dispose()


# The interactive docs and the OpenAPI file only on this machine (ASVS review, finding G): a
# deployed API does not publish a map of itself. The committed file is packages/api-client's.
def shows_docs(environment: str) -> bool:
    return environment in ("local", "test")


ON_THIS_MACHINE = shows_docs(settings.environment)

app = FastAPI(
    lifespan=lifespan,
    docs_url="/docs" if ON_THIS_MACHINE else None,
    redoc_url="/redoc" if ON_THIS_MACHINE else None,
    openapi_url="/openapi.json" if ON_THIS_MACHINE else None,
    title="Physics Anatomy API",
    version="0.0.0",
    summary="Accounts, sync, live classes, AI and exports for the Physics Anatomy lab.",
    generate_unique_id_function=operation_id,
)
# The routes the accounts switch turns off (ADR 0047): sign-in, classes, joining, sync, the
# teacher's reads, privacy and exports, live classes and AI. Everything but the exam's approved
# questions, which need no account.
ACCOUNT_ROUTERS = (
    auth.router,
    classes.teacher_router,
    classes.join_router,
    sync.router,
    teacher.router,
    privacy.router,
    live.router,
    live.socket_router,
    ai.router,
    questions.router,
)
OPEN_WITHOUT_ACCOUNTS = frozenset({"approved_questions"})

# Added last, runs first: CORS answers preflights before the origin guard sees the request.
app.add_middleware(
    AccountsSwitch,
    routes=[
        route
        for router in ACCOUNT_ROUTERS
        for route in router.routes
        if getattr(route, "name", None) not in OPEN_WITHOUT_ACCOUNTS
    ],
)
app.add_middleware(SecurityHeaders)
app.add_middleware(BodyLimit, max_bytes=MAX_BODY_BYTES)
app.add_middleware(OriginGuard)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.web_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)
for router in ACCOUNT_ROUTERS:
    app.include_router(router)
# Staff only, behind Cloudflare Access; reached from the admin portal's server (ADR 0040).
app.include_router(admin.router)
app.include_router(questions.admin_router)
if settings.environment in load_test.TEST_ENVIRONMENTS:
    app.include_router(load_test.router)
    app.include_router(ai.test_router)


class Health(BaseModel):
    status: str


@app.get("/health", tags=["system"])
def health() -> Health:
    """Liveness check used by the status page and the deploy step. Says nothing about the
    server (ASVS review, finding G)."""
    return Health(status="ok")

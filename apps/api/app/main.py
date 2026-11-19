"""The Physics Anatomy API: accounts, classes, sync and live classes; AI later in Phase 3."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRoute
from pydantic import BaseModel

from app.auth.origin import OriginGuard
from app.auth.policy import MAX_BODY_BYTES
from app.body_limit import BodyLimit
from app.config import get_settings
from app.db import get_engine
from app.live.hub import Hub, listen_dsn
from app.routes import admin, auth, classes, live, sync, teacher

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


app = FastAPI(
    lifespan=lifespan,
    title="Physics Anatomy API",
    version="0.0.0",
    summary="Accounts, sync, live classes, AI and exports for the Physics Anatomy lab.",
    generate_unique_id_function=operation_id,
)
# Added last, runs first: CORS answers preflights before the origin guard sees the request.
app.add_middleware(BodyLimit, max_bytes=MAX_BODY_BYTES)
app.add_middleware(OriginGuard)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.web_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)
app.include_router(auth.router)
app.include_router(classes.teacher_router)
app.include_router(classes.join_router)
app.include_router(sync.router)
app.include_router(teacher.router)
app.include_router(live.router)
app.include_router(live.socket_router)
# Staff only, behind Cloudflare Access; reached from the admin portal's server (ADR 0040).
app.include_router(admin.router)


class Health(BaseModel):
    status: str
    environment: str


@app.get("/health", tags=["system"])
def health() -> Health:
    """Liveness check used by the status page and the deploy step."""
    return Health(status="ok", environment=settings.environment)

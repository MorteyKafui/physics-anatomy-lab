"""The Physics Anatomy API: accounts and classes now; sync, live classes and AI later in Phase 3."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRoute
from pydantic import BaseModel

from app.auth.origin import OriginGuard
from app.auth.policy import MAX_BODY_BYTES
from app.body_limit import BodyLimit
from app.config import get_settings
from app.routes import admin, auth, classes, sync

settings = get_settings()


def operation_id(route: APIRoute) -> str:
    """Name each operation after its handler, so the TypeScript client reads well."""
    head, *rest = route.name.split("_")
    return head + "".join(word.capitalize() for word in rest)


app = FastAPI(
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
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)
app.include_router(auth.router)
app.include_router(classes.teacher_router)
app.include_router(classes.join_router)
app.include_router(sync.router)
# Staff only, behind Cloudflare Access; reached from the admin portal's server (ADR 0040).
app.include_router(admin.router)


class Health(BaseModel):
    status: str
    environment: str


@app.get("/health", tags=["system"])
def health() -> Health:
    """Liveness check used by the status page and the deploy step."""
    return Health(status="ok", environment=settings.environment)

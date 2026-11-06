"""The Physics Anatomy API. Routes for accounts, sync, live classes and AI arrive in Phase 1."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title="Physics Anatomy API",
    version="0.0.0",
    summary="Accounts, sync, live classes, AI and exports for the Physics Anatomy lab.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.web_origin],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Health(BaseModel):
    status: str
    environment: str


@app.get("/health", tags=["system"])
def health() -> Health:
    """Liveness check used by the status page and the deploy step."""
    return Health(status="ok", environment=settings.environment)

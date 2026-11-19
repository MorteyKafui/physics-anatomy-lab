"""The versions of the legal documents people agree to, and what each consent is for (ADR 0042).

A material change to a document is a new entry here, dated at least 30 days ahead (ADR 0025): until
that date the old version stays current and the API reports the new one as `upcoming`, so the web
app can give notice. From that date everyone is asked to agree again.

The versions below name the Legal and Policy Pack as drafted on 2026-11-06 (D25). They are drafts
until UEW's legal and ethics review; the version that goes live is set here before launch.
"""

from dataclasses import dataclass
from datetime import date
from typing import Literal

Purpose = Literal["terms", "privacy", "analytics"]

# Agreeing to these is how an account is used; they are withdrawn only by deleting the account.
REQUIRED: tuple[Purpose, ...] = ("terms", "privacy")
# Optional, and only ever for teachers: a student is never asked about analytics (ADR 0042).
OPTIONAL_FOR_TEACHERS: tuple[Purpose, ...] = ("analytics",)

NOTICE_DAYS = 30


@dataclass(frozen=True)
class Version:
    version: str
    effective_from: date


@dataclass(frozen=True)
class Document:
    title: str
    versions: tuple[Version, ...]  # oldest first


DRAFT_PACK = Version("2026-11-06 draft", date(2026, 11, 6))

DOCUMENTS: dict[Purpose, Document] = {
    "terms": Document("Terms of Use", (DRAFT_PACK,)),
    "privacy": Document("Privacy Policy", (DRAFT_PACK,)),
    # Analytics is governed by the Cookies and Storage policy.
    "analytics": Document("Cookies and Storage", (DRAFT_PACK,)),
}


def current(purpose: Purpose, today: date) -> Version:
    """The version in force today: the latest one whose date has come."""
    live = [v for v in DOCUMENTS[purpose].versions if v.effective_from <= today]
    return live[-1] if live else DOCUMENTS[purpose].versions[0]


def upcoming(purpose: Purpose, today: date) -> Version | None:
    """A published version that is not in force yet: the notice period is running."""
    later = [v for v in DOCUMENTS[purpose].versions if v.effective_from > today]
    return later[0] if later else None


def agreeable(purpose: Purpose, today: date) -> tuple[str, ...]:
    """The versions a person may agree to today: the current one, and an upcoming one early."""
    soon = upcoming(purpose, today)
    return (current(purpose, today).version,) + ((soon.version,) if soon else ())

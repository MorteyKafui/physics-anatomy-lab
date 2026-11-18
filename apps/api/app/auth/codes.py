"""Random tokens and codes, and how they are hashed and typed in."""

import hashlib
import secrets
import string

from app.auth.policy import CLASS_CODE_LENGTH, CODE_ALPHABET, REJOIN_CODE_LENGTH


def new_token() -> str:
    """A 256-bit random token, URL-safe."""
    return secrets.token_urlsafe(32)


def hash_secret(value: str) -> bytes:
    """SHA-256 of a token or code. High-entropy secrets need no salt or slow hash."""
    return hashlib.sha256(value.encode("utf-8")).digest()


def _code(length: int) -> str:
    return "".join(secrets.choice(CODE_ALPHABET) for _ in range(length))


def new_class_code() -> str:
    return _code(CLASS_CODE_LENGTH)


def new_rejoin_code() -> str:
    return _code(REJOIN_CODE_LENGTH)


def normalise_code(typed: str) -> str:
    """What a student typed, as stored: upper case, with spaces and dashes dropped."""
    return "".join(c for c in typed.upper() if c not in string.whitespace and c != "-")


def is_code(value: str, length: int) -> bool:
    return len(value) == length and all(c in CODE_ALPHABET for c in value)


def show_code(code: str) -> str:
    """A code as people read it: 7KQ42M → 7KQ-42M; 8 characters as two groups of four."""
    half = len(code) // 2
    return f"{code[:half]}-{code[half:]}"

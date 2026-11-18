"""Google sign-in for teachers: code flow with PKCE, then the ID token checked (ADR 0038)."""

import base64
import hashlib
import time
from dataclasses import dataclass
from typing import Any, Protocol
from urllib.parse import urlencode

import httpx
from joserfc import jwt
from joserfc.errors import JoseError
from joserfc.jwk import KeySet

from app.config import get_settings

AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"  # noqa: S105 (a URL, not a password)
KEYS_URL = "https://www.googleapis.com/oauth2/v3/certs"
ISSUERS = ["https://accounts.google.com", "accounts.google.com"]
KEYS_KEPT_FOR = 3600.0


@dataclass(frozen=True)
class GoogleIdentity:
    sub: str
    email: str
    name: str | None


class GoogleSignInError(Exception):
    pass


class GoogleProvider(Protocol):
    def authorization_url(self, state: str, nonce: str, code_verifier: str) -> str: ...

    async def identity(self, code: str, code_verifier: str, nonce: str) -> GoogleIdentity: ...


def code_challenge(code_verifier: str) -> str:
    """PKCE S256: base64url of the verifier's SHA-256, without padding (RFC 7636)."""
    digest = hashlib.sha256(code_verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")


def redirect_uri() -> str:
    return f"{get_settings().api_public_url}/auth/google/callback"


class Google:
    def __init__(
        self,
        client_id: str,
        client_secret: str,
        transport: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._transport = transport  # tests pass a fake Google here
        self._client_id = client_id
        self._client_secret = client_secret
        self._keys: KeySet | None = None
        self._keys_at = 0.0

    def authorization_url(self, state: str, nonce: str, code_verifier: str) -> str:
        query = urlencode(
            {
                "client_id": self._client_id,
                "redirect_uri": redirect_uri(),
                "response_type": "code",
                "scope": "openid email profile",
                "state": state,
                "nonce": nonce,
                "code_challenge": code_challenge(code_verifier),
                "code_challenge_method": "S256",
                "prompt": "select_account",
            }
        )
        return f"{AUTHORIZE_URL}?{query}"

    async def _key_set(self) -> KeySet:
        if self._keys is None or time.monotonic() - self._keys_at > KEYS_KEPT_FOR:
            async with httpx.AsyncClient(timeout=10.0, transport=self._transport) as http:
                response = await http.get(KEYS_URL)
                response.raise_for_status()
                self._keys = KeySet.import_key_set(response.json())
                self._keys_at = time.monotonic()
        return self._keys

    async def identity(self, code: str, code_verifier: str, nonce: str) -> GoogleIdentity:
        try:
            async with httpx.AsyncClient(timeout=10.0, transport=self._transport) as http:
                response = await http.post(
                    TOKEN_URL,
                    data={
                        "grant_type": "authorization_code",
                        "code": code,
                        "code_verifier": code_verifier,
                        "client_id": self._client_id,
                        "client_secret": self._client_secret,
                        "redirect_uri": redirect_uri(),
                    },
                )
                response.raise_for_status()
            token: dict[str, Any] = response.json()
            id_token = token.get("id_token")
            if not isinstance(id_token, str):
                raise GoogleSignInError("Google sent no ID token.")
            decoded = jwt.decode(id_token, await self._key_set(), algorithms=["RS256"])
            jwt.JWTClaimsRegistry(
                iss={"essential": True, "values": ISSUERS},
                aud={"essential": True, "value": self._client_id},
                nonce={"essential": True, "value": nonce},
                sub={"essential": True},
                exp={"essential": True},
            ).validate(decoded.claims)
        except (httpx.HTTPError, JoseError, ValueError) as error:
            raise GoogleSignInError(str(error)) from error
        return identity_from_claims(decoded.claims)


def identity_from_claims(claims: dict[str, Any]) -> GoogleIdentity:
    email = claims.get("email")
    if claims.get("email_verified") is not True or not isinstance(email, str):
        raise GoogleSignInError("Google has not verified this account's email.")
    name = claims.get("name")
    return GoogleIdentity(
        sub=str(claims["sub"]), email=email, name=name if isinstance(name, str) else None
    )


_google: Google | None = None


def get_google() -> GoogleProvider | None:
    """The Google client, or None when Google sign-in is not configured."""
    global _google
    settings = get_settings()
    if not settings.google_enabled:
        return None
    if _google is None:
        assert settings.google_client_id and settings.google_client_secret
        _google = Google(
            settings.google_client_id, settings.google_client_secret.get_secret_value()
        )
    return _google

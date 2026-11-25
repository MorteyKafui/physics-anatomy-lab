"""Every API answer carries the security headers (docs/security/asvs-review-brief.md)."""

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from fastapi.testclient import TestClient

from app.main import app
from app.security_headers import SecurityHeaders


def test_every_answer_carries_the_headers_and_is_not_cached() -> None:
    client = TestClient(app)
    for response in (client.get("/health"), client.get("/no-such-route")):
        assert response.headers["content-security-policy"] == (
            "default-src 'none'; frame-ancestors 'none'"
        )
        assert response.headers["x-content-type-options"] == "nosniff"
        assert response.headers["referrer-policy"] == "no-referrer"
        assert response.headers["cross-origin-resource-policy"] == "same-origin"
        assert response.headers["cache-control"] == "no-store"


def test_a_route_that_sets_its_own_cache_control_keeps_it() -> None:
    small = FastAPI()
    small.add_middleware(SecurityHeaders)

    @small.get("/cached")
    def cached() -> JSONResponse:  # pyright: ignore[reportUnusedFunction]
        return JSONResponse({}, headers={"Cache-Control": "public, max-age=60"})

    response = TestClient(small).get("/cached")
    assert response.headers.get_list("cache-control") == ["public, max-age=60"]
    assert response.headers["x-content-type-options"] == "nosniff"

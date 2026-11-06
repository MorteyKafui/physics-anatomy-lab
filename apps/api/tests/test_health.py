from fastapi.testclient import TestClient

from app.main import app


def test_health_reports_ok() -> None:
    response = TestClient(app).get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_openapi_schema_is_published() -> None:
    schema = TestClient(app).get("/openapi.json").json()
    assert schema["info"]["title"] == "Physics Anatomy API"

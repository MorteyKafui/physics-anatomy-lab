# Physics Anatomy API

FastAPI on PostgreSQL (decision D16). On your machine it runs against your installed
PostgreSQL 18, with no Docker (decision D23).

```powershell
cd apps/api
.\scripts\create-dev-databases.ps1     # once: role pa_app, dev and test databases
copy .env.example .env                  # then set your password in .env
uv sync                                 # installs Python 3.14 and every dependency, writes uv.lock
uv run alembic upgrade head            # build or update the schema
uv run fastapi dev app/main.py          # http://localhost:8000/docs
uv run pytest                           # point DATABASE_URL at physics_anatomy_test first
```

## Accounts (ADR 0038)

- Teachers sign in with an email link (`/auth/email-link`) or Google (`/auth/google/start`,
  off unless `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set). Locally the sign-in email
  is written to the log.
- Students join with a class code and a display name (`/join`). No email, age or phone number.
- Sessions are rows in `sessions`; the browser holds an HttpOnly cookie.

## The TypeScript client

After changing a route or schema:

```powershell
uv run python -m scripts.export_openapi   # writes packages/api-client/openapi.json
cd ../../packages/api-client; bun run generate
```

A test fails while `openapi.json` is out of date.

Commit `uv.lock` after the first `uv sync`.

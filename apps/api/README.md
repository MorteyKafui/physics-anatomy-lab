# Physics Anatomy API

FastAPI on PostgreSQL (decision D16). On your machine it runs against your installed
PostgreSQL 18, with no Docker (decision D23).

```powershell
cd apps/api
.\scripts\create-dev-databases.ps1     # once: role pa_app, dev and test databases
copy .env.example .env                  # then set your password in .env
uv sync                                 # installs Python 3.14 and every dependency, writes uv.lock
uv run fastapi dev app/main.py          # http://localhost:8000/docs
uv run pytest
```

Commit `uv.lock` after the first `uv sync`.

# Set up Physics Anatomy on Windows

## The quick way

From the repository root, in PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\setup-windows.ps1
```

It installs everything, runs every check, creates the lockfiles, offers to create the databases
and commits the lockfiles. The steps below are what it does, if you prefer to run them by hand.

## By hand

No Docker is needed (decision D23). You need:

- **Bun 1.4** for the TypeScript workspaces.
- **Git.**
- **uv**, which installs Python 3.14 for you: `powershell -c "irm https://astral.sh/uv/install.ps1 | iex"`.
- **PostgreSQL 18**, already installed on your machine.

## 1. Install the TypeScript side

```powershell
cd $HOME\Desktop\physics-anatomy
bun install
bun run check        # typecheck, lint and tests
git add bun.lock; git commit -m "chore: add bun lockfile"
```

## 2. Create the databases

```powershell
cd apps\api
.\scripts\create-dev-databases.ps1
# it writes apps\api\.env for you
```

This creates the `pa_app` role, `physics_anatomy_dev` and `physics_anatomy_test`, with the
`citext` and `pg_trgm` extensions.

## 3. Run the API

```powershell
uv sync                         # creates .venv and uv.lock
uv run pytest
uv run fastapi dev app/main.py  # http://localhost:8000/docs
git add uv.lock; git commit -m "chore: add api lockfile"
```

## 4. Run the physics validation

```powershell
cd ..\..\validation
uv sync
uv run pytest
git add uv.lock; git commit -m "chore: add validation lockfile"
```

## 5. Run the apps

```powershell
cd ..
bun run dev     # web on http://localhost:3000, admin on http://localhost:3001
```

## If git says "detected dubious ownership"

The folder was created through the Claude desktop link. Mark it as safe once:

```powershell
git config --global --add safe.directory C:/Users/morte/Desktop/physics-anatomy
```

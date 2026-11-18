"""Write the API's OpenAPI schema to packages/api-client/openapi.json.

Run from apps/api: `uv run python -m scripts.export_openapi`, then `bun run generate` in
packages/api-client. A test fails while the committed file is out of date.
"""

import json
from pathlib import Path

from app.main import app

TARGET = Path(__file__).parents[3] / "packages" / "api-client" / "openapi.json"

if __name__ == "__main__":
    TARGET.write_text(json.dumps(app.openapi(), indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {TARGET}")

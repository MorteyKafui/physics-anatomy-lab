# @pa/api-client

The API's types, generated from its OpenAPI schema so both languages share one contract, and a
small typed client over `fetch` (`createApi`).

```powershell
cd apps/api; uv run python -m scripts.export_openapi   # writes openapi.json here
cd ../../packages/api-client; bun run generate          # writes src/generated
```

A test in `apps/api` fails while `openapi.json` is out of date.

Only the types are generated: `@hey-api/openapi-ts`'s runtime client does not pass the
repository's strict TypeScript settings (`exactOptionalPropertyTypes`) or lint rules, so the calls
are written by hand in `src/client.ts`, typed from the generated schema.

Every call is made from a sign-in, join or teacher screen, never from the lab, which works signed
out and offline. A failed fetch returns `{ ok: false, status: 0 }` with an offline message.

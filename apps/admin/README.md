# @pa/admin

The admin portal for the team, on its own subdomain behind Cloudflare Access (decisions D17 and
D30, ADR 0040). It is rebuilt from `design/mockups/Admin.dc.html`.

```powershell
bun run dev --filter @pa/admin   # http://localhost:3001
```

## How it reaches the API

Pages are server components. They call the API's `/admin/*` routes from the portal's server
(`src/lib/api.ts`), passing on the `Cf-Access-Jwt-Assertion` header that Cloudflare Access adds
to every request. The API checks that token; the browser never calls the admin API. Changes go
through server actions (`src/app/actions.ts`), and the API writes each one to the audit log.

| Setting         | Where         | What                                                    |
| --------------- | ------------- | ------------------------------------------------------- |
| `ADMIN_API_URL` | portal server | The API's address. Defaults to `http://localhost:8000`. |

Locally there is no Access in front, so set `ADMIN_DEV_BYPASS_EMAIL` in `apps/api/.env` (see
`.env.example`): the API then treats every admin call as that person, marked "Dev bypass" in the
audit log. The API refuses that setting outside `local` and `test`.

## Areas

Overview, Usage, Learning, Content, Support, People and access, System and Audit log read live
numbers. Question bank, AI, Research and Translation say they are not built yet. Anything the
system does not record yet says so, rather than showing a number (D29).

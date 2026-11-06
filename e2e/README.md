# @pa/e2e

End-to-end, accessibility and performance gates (master plan, "Gates on every pull request").
Playwright runs every journey at desktop and phone size against production builds of
`apps/web` (port 3100) and `apps/admin` (port 3101), so it never collides with `bun run dev`.

```powershell
bun run build                      # build both apps once
bunx playwright install chromium   # first time only
bun run --cwd e2e e2e
```

- `tests/*.journey.spec.ts`: what a visitor sees and does.
- `tests/accessibility.spec.ts`: axe on every page; fails on a serious or critical issue.
- `tests/performance.spec.ts`: Largest Contentful Paint on the landing page over slow 4G,
  budget 2.5 s (master plan section 13).

# Anatomy kit (vendored for the 3D bench spike)

These files are copied unchanged from the `anatomy` skill, MIT-licensed, © 2026 Ryan (see
`LICENSE`), for the Phase 1 3D bench spike only (ADR 0036). They are not linted, and nothing here
ships to students.

- Source: `wheresryan22/anatomy` on GitHub, as installed in `Desktop/wave-motion/.agents/skills/anatomy`
  (skills-lock hash `76838f81…514d`), copied 2026-11-11.
- Files: `iso-kit.mjs`, `lathe.mjs`, `tube.mjs`, `audit.mjs` and `iso.css` (the kit), and
  `turn.mjs`, `turn-build.mjs` and `turn-audit.mjs` (the 3D mode, beta).
- Only `turn.mjs` and `iso.css` reach the browser. The rest runs at build time on the server, or
  in `../3d-bench/anatomy/audit.mjs`.

If the spike's decision keeps Anatomy 3D, the kit moves to `packages/apparatus` with an entry in
the licences inventory (harvest review, Wavelab `components/iso`).

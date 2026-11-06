# @pa/ui

The design system: tokens, four themes, Lyra components on Base UI, Lucide icons and the
pendulum P logo. See every part at `/design-system` in the admin app (`bun run dev`, then
http://localhost:3001/design-system).

## Use it in an app

```css
/* src/app/globals.css */
@import "tailwindcss";
@import "@pa/ui/styles.css";
```

```tsx
import { Logo } from "@pa/ui";
import { Button } from "@pa/ui/components/button";
import { PlayIcon } from "@pa/ui/icons";
```

Load Geist, Geist Mono and Bricolage Grotesque with `next/font` as the CSS variables
`--font-geist`, `--font-geist-mono` and `--font-bricolage` (see `apps/web/src/app/layout.tsx`).

## Themes

Set `data-theme` on `<html>` (popups open in a portal on `<body>`, so it must be that high):

| Theme       | For                                                       |
| ----------- | --------------------------------------------------------- |
| `lab`       | The dark lab, dashboards and admin. The default.          |
| `bench`     | The light lab, on warm bench paper.                       |
| `site`      | The public site, reports and printed sheets.              |
| `projector` | Shared projectors in bright rooms: 7:1 contrast for text. |

Components use roles (`bg-background`, `text-muted-foreground`, `text-accent-text`…), never palette
colours. shadcn's names are kept; note that our red-orange is shadcn's `primary`, and shadcn's
`accent` is only a hover background. For red-orange text use `text-accent-text`, which is darker
on light themes so it stays readable.

To change a theme, edit `src/themes.ts` and run `bun run themes`, which regenerates
`src/themes.css`. The tests fail if the two differ or if any text falls below 4.5:1 (7:1 on
the projector theme), or a control border or focus ring below 3:1.

## Rules built in

- **Square corners (Lyra).** Tailwind's `rounded-sm` to `rounded-xl` do not exist here. Use
  `rounded-full` only for truly round things: status dots, the bob, progress rings, the stopwatch.
  An end-to-end test fails on any other visible rounded corner.
- **Touch targets.** Controls are 36 px for a mouse, as in the mockups, and at least 44 px on a
  touch screen (`pointer-coarse`).
- **Numbers line up.** `font-mono`, `code` and `kbd` use tabular figures.
- **Reduced motion** turns animations and transitions off.

## Adding a component

```powershell
cd packages/ui
bunx --bun shadcn@4 add <name>
```

Then check the new file: import `cn` from `@pa/ui/lib/utils` (not the `cn` package), use
`text-accent-text` rather than `text-primary` for text, avoid translucent text such as
`text-foreground/60`, and add it to the catalogue so the accessibility and Lyra tests cover it.

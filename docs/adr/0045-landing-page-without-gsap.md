# 0045. The landing page is built without GSAP

- Status: accepted (Mortey, 2026-11-20, in chat, approving the landing page brief)
- Date: 2026-11-20
- Changes: the master plan's stack row "Motion: Motion for the interface, GSAP for the landing
  story", and "GSAP for story" in the landing page section

## Context

The plan chose GSAP for a scroll story on the landing page: an apparatus assembling part by part
as the visitor scrolls. The approved landing board (`design/mockups/Main.dc.html`, D28) replaced
that story. The exploded pendulum stand is a slider the visitor moves, and every other moving
part is a small loop: the double-slit hero, the swinging pendulum and the coach's cursor demo.
Nothing on the board is driven by scrolling.

## Decision

The landing page uses no animation library. Its loops are canvas drawing, CSS animation and a
few lines of React, and all of them stop with reduced motion or in Lite mode
(`docs/content/landing-page-brief.md`, decisions 2 and 3).

## Consequences

- GSAP's about 25 KB compressed stays off the first visit, which keeps the landing page inside
  the shell's 200 KB budget on the benchmark phone.
- If a later board brings back a scroll story, a new record decides the library then.
- The plan's two lines need changing. The plan is a Claude Doc owned by the main account, so the
  main account changes it there and exports it here (AGENTS.md); until then this record is the
  source.

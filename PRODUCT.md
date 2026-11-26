# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Students** from senior high school (WASSCE) to first-year university, mostly in Ghana, often
  on a shared or low-end Android phone with a patchy connection, sometimes on a school computer
  lab's desktops. They come to do a named practical (the simple pendulum, Ohm's law and the
  potentiometer, the converging lens, the method of mixtures) and get it right before the real
  one or the exam.
- **Teachers and lecturers** who set a practical, show it on a projector, or send students a
  link to it.
- **Researchers** who check the physics models against their own data.

## Product Purpose

A virtual physics lab: students build the real apparatus piece by piece, take their own
readings, and are coached until their table, graph and report are right. Success is a student
who can do the real practical, and a teacher who trusts the numbers. Tagline: "Physics from
first principles."

## Positioning

Every number on screen comes from the same equations as the lab (`packages/physics`), checked
against an independent Python model. The practicals are the exact ones on the WASSCE and
university lists, marked the way practicals are marked: tabulation, graph, slope and
precautions. It works offline once installed. PhET-style simulations show the physics; Physics
Anatomy makes you do the practical.

## Operating Context

- Open to anyone: no sign-in, sign-up or class code (ADR 0047). Work stays on the device.
- Anonymous usage counts only (ADR 0048).
- The lab is a darkened practical room; the site around it is light, warm paper (ADR 0003).
- Presented locally before going live, often on a projector.

## Capabilities and Constraints

- Next.js web app (`apps/web`), staff-only admin (`apps/admin`), FastAPI API (`apps/api`).
- Design system: shadcn on Base UI, Lyra style: square corners everywhere; only things round in
  reality (status dots, the bob, progress rings, the stopwatch) are round (ADR 0006).
- Tokens only from `packages/ui`; type is Geist, Geist Mono and Bricolage Grotesque (ADR 0034).
- Offline first; lab JavaScript budget 160 KB on top of the shell (ADR 0044); landing page has
  no animation library (ADR 0045).
- Copy: plain, active, sentence case, British spelling. No all-caps, no monospace eyebrows.

## Brand Commitments

- Name: Physics Anatomy. The pendulum P logo; its bob is the only red-orange (#F0482A) part.
- One hue per physics topic (mechanics, electricity, light, heat).
- Visual world for the 2026-11 redesign, chosen by Mortey on 2026-11-26: **the anatomy
  plate**. Each experiment is shown as a plate from a scientific atlas: the real apparatus drawn
  in fine line, numbered leader lines to its parts, and a specimen label carrying live readings.

## Evidence on Hand

- Six working experiments with live simulations and computed readings.
- No users, testimonials, partner logos, school names or usage numbers yet. Never invent them
  (ADR 0029).

## Product Principles

1. Show the real practical, not a cartoon of physics.
2. Every number is computed, never typed.
3. Open to anyone, on any phone, with or without a connection.
4. Coach like a patient teacher: say what went wrong and what to do next.
5. Nothing collected about children.

## Accessibility & Inclusion

Keyboard focus visible, reduced motion respected (and a Lite mode), contrast checked, every
control labelled, audio mode reads steps and corrections aloud. Works on a 360 px phone.

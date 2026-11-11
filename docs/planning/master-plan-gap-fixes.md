# Gap fixes

Each gap from the final review now has a spec: what will be built, the rule it follows, and how we will know it works. Three items are done; the rest are specified for their phase.

| Gap | Status |
| --- | --- |
| Legal documents | **Drafted:** the Legal and Policy Pack (terms, privacy, children and schools, cookies, AI and acceptable use, accessibility, research consent), awaiting UEW review |
| Name and brand check | **Preliminary check done** (below); formal search pending |
| Running costs and funding | **Done: interactive cost model, prices checked 6 Nov 2026** |
| All others | **Specified below**, built in the phase shown on the master plan |

## Experiment versioning for saved work (Phase 1)

- Every experiment has a version (major.minor.patch). Every attempt stores the experiment's id and version, the model version and the seed.
- **Patch and minor** changes (wording, a new hint, a bug fix that does not change results) open old attempts in the new version through a small, tested upgrade function.
- **Major** changes (the model or the steps change) keep the old version loadable: old attempts open read-only in the version they were made in, with a "Redo in the new version" button.
- Reports, exports and research data name the version they came from.
- **Proof:** CI keeps a saved attempt from every released version and fails if any stops loading.

## First-run onboarding (Phase 1)

A 60-second tour with five stops: the bench, the coach panel, the step strip, the camera (snapshots) and Help. It is skippable, can be replayed from Help, and is spoken aloud if voice is on. It ends at the level-and-goal picker that recommends a first experiment. **Proof:** tour completion and first-step success rates in the admin portal.

## Lite mode (Phase 1)

- Offered automatically when the device reports 2 GB of memory or less, the connection is slow, or the first five seconds run below 30 frames per second. Always available in Settings.
- It turns off 3D, shaders and decorative motion; draws apparatus with less fine detail; and stops prefetching.
- **Proof:** the benchmark phone completes the pendulum in lite mode within the performance budgets.

## Print stylesheets (Phase 1)

Reports, tables, graph sheets and worksheets print on A4 or Letter, in black and white, with no table split across pages, and with the branded header and footer and page numbers. **Proof:** a print test in CI compares PDF output with approved samples.

## Search (Phase 2)

Ctrl+K (or the search button) finds experiments, symbols, formulas, glossary terms, help articles and settings. The index is built with the app, so search works offline, and it is built per language.

## Student account recovery (Phase 3)

- A student's link to their class is a token saved on their device, under the display name they chose.
- If they lose their device or switch to another one, their teacher issues a one-time personal re-join code, valid for 24 hours, that restores their work. Teachers can also merge two entries for the same student.
- A student who turns 18 can convert to their own account with an email address and keep all their work.

## Email and notifications (Phase 3)

- **Email to adults only** (we hold no student emails): sign-in links, invitations to co-teach a class, a weekly teacher digest (submissions, students who are stuck), policy-change notices, security notices.
- **In-app notifications for students:** assignment due, a teacher's hint, a reviewed report.
- Each email type has its own on/off switch and unsubscribe link, except security and legal notices. Templates go through the translation files.
- The domain is set up with SPF, DKIM and DMARC so emails reach inboxes.

## Content editing without code (Phase 3)

1. A reviewer or teacher with an editor role selects any text in an experiment in the admin portal and suggests a change.
2. The portal turns it into a pull request on the experiment's content files.
3. A physics reviewer approves it, either on GitHub or with an approve button in the portal.
4. It merges and deploys like any other change.

So the review rules still apply, and nobody needs to learn git.

## Licences of everything we ship (Phase 0, then every release)

- CI generates a software bill of materials (CycloneDX) for npm and Python, and checks every licence against an allow-list: MIT, Apache-2.0, BSD, ISC; OFL for fonts; CC0 and CC BY for media.
- GPL and AGPL code is blocked from the shipped app. This is also why PhET's code is studied, not copied.
- An assets register lists every font, icon set (Lucide: ISC), sound, voice and drawing kit (Anatomy: MIT) with its licence and source.
- A notices page in the app is generated from the bill of materials and the assets register.

## Real-device testing (Phases 1 and 6)

| Device | Why |
| --- | --- |
| Low-cost Android phone, 2 GB of memory | The benchmark |
| Mid-range Android phone, 4 GB | The common case |
| An older iPhone | Safari's quirks |
| A Windows laptop | Teachers' machines |
| A school projector at 1024 × 768 | Classroom use, projector theme |

A cloud device lab runs a smoke test every night. Before each release, a written test script is run on the physical devices under slow-3G and offline conditions.

## Support and incident process (Phase 6)

| Kind | First response target |
| --- | --- |
| Safeguarding concern | 1 working day |
| A problem stopping a class | 1 working day |
| Other bugs and questions | 5 working days |

- Help requests land in the admin portal's support inbox, are labelled, and link to issues.
- Incidents are graded by severity, from SEV1 (the lab is down for everyone) to SEV3 (one feature is degraded). The person on call (Mortey at first) follows the runbooks and updates the status page.
- Every SEV1 and SEV2 gets a written, blameless review within 5 working days.

## Name and brand check (Phase 0)

A web search on 6 November 2026 found no app, course or product called "Physics Anatomy". The similarly named results are biology apps (anatomy and physiology). That is encouraging but not a legal clearance. Before buying the domain or printing anything:

- Search Ghana's trademark register at the Registrar-General's Department, the WIPO Global Brand Database and the US Patent and Trademark Office.
- Check the domain options and social media handles.

## Running costs and funding (Phase 0)

Built as an interactive page, **Physics Anatomy Running Costs** (in your artifacts), from each provider's published prices on 6 November 2026. Every assumption can be edited and every number updates.

| Monthly active students | Monthly total | Per student per month |
| --- | --- | --- |
| 1,000 | about $222 | $0.22 |
| 10,000 | about $484 | $0.048 |
| 100,000 | about $3,726 | $0.037 |

What it shows:

- **Fixed costs dominate at small scale.** At 1,000 students, most of the bill is always-on hosting (API containers and the database for live classes) plus monitoring and tools.
- **AI is the bill at large scale**, about 59% at 100,000 students. Most of that is report review and what-if scenarios on Sonnet. Running them on Haiku costs about a twentieth as much.
- **Spoken AI replies** cost about $300 a month at 100,000 students with a cloud voice. They cost nothing if the browser's own voice reads them. Scripted coach lines stay on the neural voice and cost almost nothing.
- **Analytics** stay free up to about 20,000 students at 100 events each. Learning data comes from our own database, so PostHog only needs a few product events.
- **Not included:** one-time costs (penetration test, trademark and Data Protection Commission fees, test phones) and people's time.

These figures rest on usage assumptions. They should be replaced with measured usage after the pilot.

# Experiment pages with structured data: brief

The third Phase 5 item (master plan, "Experiment pages with structured data"), written for review
before anything is built. The plan says: "Every experiment also gets its own server-rendered page
with structured data (`LearningResource`) and a social image, so search engines can find it." There
is no approved board for these pages, so a draft board comes with this brief:
`design/mockups/ExperimentPage.dc.html`.

- **Status:** approved by Mortey on 2026-11-25, as proposed: model cards now (decision 3a), for his physics review before merge, and the two second-method labs on pages of their own.

## The decisions

### 1. Six pages, one index, at `/experiments`

- `/experiments` lists every lab. The landing page's cards and "Experiments" link go to it.
- There is one page per lab that exists today:
  - `/experiments/simple-pendulum`
  - `/experiments/ohms-law`
  - `/experiments/converging-lens`
  - `/experiments/converging-lens-pins`
  - `/experiments/method-of-mixtures`
  - `/experiments/method-of-mixtures-solid`

  The two "second method" labs get pages of their own, because they are separate labs with their
  own aims. Each also links to its sibling.

- The lab itself stays at `/lab/<id>`. An experiment page is what someone reads before opening it,
  and what a search engine finds.
- No page for a planned experiment (AGENTS.md rule 2).

### 2. What each page says, all from what the lab already holds

Nothing new is typed in. Each page is built from the experiment's own definition and copy:

- its **title** and **topic** colour;
- its **aim**, the report's aim line (`experiments.<id>.report.aim`);
- its **apparatus**, the report's apparatus list;
- **what you do**, the lab's step names;
- **what the coach catches**, the experiment's mistake rules by name: the ones the teacher's board
  already names (for the pendulum: counting from one, stopping early, the thread tied round the clamp);
- **the physics**: the equation the graph rests on (T² = 4π² l ⁄ g, and so on), and the quantity the
  student finds from the slope or intercept;
- its **drawing**, the experiment card's stage from the landing page;
- **links**: Open the lab, Check your own lab data (`/lab/<id>/check`), Print sheets
  (`/lab/<id>/sheets`) and Exam mode (every lab has all three);
- a **version and a suggested citation** (decision 4).

### 3. Model cards: now, or as their own item

The plan's research section asks for a model card per experiment: its equations, assumptions,
limits and validation results. They do not exist yet, and their assumptions and limits are physics
statements a reviewer must approve (AGENTS.md rule 1). Two choices:

- **(a) Now, on these pages (recommended).** I draft each experiment's card from its model and its
  validation fixture. For example, for the pendulum: the exact period by the arithmetic–geometric
  mean, a point bob, a light inextensible thread, no air drag, an 8° swing, and agreement with SciPy's
  elliptic integral to 1 part in 10¹². You review the wording as physics reviewer before merge.
- **(b) Later.** The pages ship without model cards, and the cards become a research item of their
  own.

### 4. Version and citation

Each experiment already has a content version (`version: 1`), printed on every labelled export.
The page shows it and suggests a citation:

> Physics Anatomy (2026). _Simple pendulum_, version 1. https://[domain]/experiments/simple-pendulum

The address comes from `SITE_URL`, so the citation is right once the domain is bought. The publisher
named in the citation is "Physics Anatomy" until the operator in the Terms ([[Operator]]) is settled.

### 5. Structured data: `LearningResource`, checked

Each page carries JSON-LD:

| Field                  | Value                                                                      |
| ---------------------- | -------------------------------------------------------------------------- |
| `@type`                | `LearningResource`                                                         |
| `name`, `description`  | the title and the aim                                                      |
| `learningResourceType` | "Virtual laboratory"                                                       |
| `educationalLevel`     | "Senior high school (WASSCE)" and "University", as the plan's audience is  |
| `teaches`              | what the slope or intercept gives (g; E and r; f; the water equivalent; c) |
| `inLanguage`           | "en-GB"                                                                    |
| `isAccessibleForFree`  | true (confirmed by Mortey)                                                 |
| `version`              | the experiment's version                                                   |
| `url`, `image`         | the page and its social card                                               |
| `provider`             | Physics Anatomy, as an `Organization`                                      |
| `about`                | the topic                                                                  |

A test parses every page's JSON-LD and checks it against this table, so a field can't go missing
unnoticed. There is no `educationalAlignment` to the WASSCE syllabus yet: I won't claim alignment
to a syllabus section until you or a physics reviewer have named the sections.

### 6. A social card per experiment

1200 × 630 px, like the site's card: the experiment's drawing, its title, its topic colour along the
bottom, and its aim. Static, made when the site is built.

### 7. Found by search engines

- A `sitemap.xml` listing the landing page, `/experiments` and the six pages, with the pages' real
  last-changed dates.
- A `robots.txt` that allows them and points to the sitemap, and keeps the lab's own screens and
  `/teach` out of the index.
- A canonical URL on every page.

All of it takes its addresses from `SITE_URL`, so nothing changes in code when the domain is bought.

### 8. Performance and accessibility

The pages are static HTML with no script of their own, apart from the landing page's header.
Budgets are the landing page's (LCP 2.5 s or less on slow 4G, CLS 0). Pages join the accessibility
and link tests, and Core Web Vitals are measured before and after.

### 9. One pull request

Six pages from one template, the index, the cards, the sitemap and the tests fit one reviewable pull
request. Model cards, if decision 3 is (a), add six short sections for physics review.

## What I need from you

1. Approval of this brief and the draft board, or changes.
2. Decision 3: model cards now (a), or later (b).
3. Whether the two second-method labs (pins, hot solid) get their own pages (decision 1) or share
   their first method's page.

# Team, partners, contributors and donate pages: brief

The fourth and last Phase 5 item (master plan, "Team, partners, contributors and donate pages"),
written for review before anything is built. The plan says:

- the landing page's people section names "Dr Isaac Kwesi Acquah and Mortey Kafui, UEW, partners
  and sponsors, and how to contribute or donate";
- contributors are listed in `CONTRIBUTORS.yml`, which generates the credits page;
- sponsors, donors and partners follow `docs/partners.md`, which covers:
  - tiers;
  - how logos are added (a data file and a review);
  - the donation route, agreed with UEW;
  - two firm rules: no ads shown to students, and no sponsor influence over content.

There is no approved board for these pages, so a draft comes with this brief:
`design/mockups/People.dc.html`.

The rule for this item is that partners, team and donate details come only from Mortey, and
nothing is invented (AGENTS.md rule 2). Most of the details aren't in yet, so the pages are built
to show their details when they arrive and a plain empty state until then.

- **Status:** approved by Mortey on 2026-11-25, as proposed, including publishing the two partner rules. The details in "What I need from you" (2 to 6) follow later, so the pages are built in their empty states.

## The decisions

### 1. Four pages, linked from the footer

| Page                                | Address       | Footer column                                |
| ----------------------------------- | ------------- | -------------------------------------------- |
| The team                            | `/about`      | Help, as "About" (the board's footer has it) |
| Partners and sponsors               | `/partners`   | Product                                      |
| Contributors, and how to contribute | `/contribute` | Product                                      |
| Donate                              | `/donate`     | Product                                      |

The footer gains these links. No page is linked from the header, which keeps its four sections.

### 2. Everything shown comes from data files Mortey approves

- `apps/web/content/team.yml`: name, role and an optional photo, with the date the person agreed to
  be listed.
- `apps/web/content/partners.yml`: name, kind (partner, sponsor or donor), logo, link, and the date
  they gave written permission to show their name and logo.
- `CONTRIBUTORS.yml` at the repository root: name, what they contributed, and the date they agreed
  to be listed.

A test checks each file against its schema, and refuses an entry without its consent date. So
nobody appears on the site without having agreed to it, and a logo can't go up without
permission. Each file starts empty.

### 3. The team page: empty until you confirm

The plan names Dr Isaac Kwesi Acquah and Mortey Kafui, but a public team page needs each person's
agreement and the role they want shown. **I propose the page starts empty** ("The team's page is
being written") **and lists the two of you once you confirm your names, roles and photos.** Dr
Acquah's agreement should come from him.

The same goes for UEW. The site will say how Physics Anatomy relates to the university only in
words you give me, for example "a research project at the University of Education, Winneba". It
won't use UEW's name or logo until UEW agrees.

### 4. Partners and sponsors: the rules now, the names later

- The page states the plan's two firm rules: **no ads are ever shown to students, and no sponsor
  has a say in the content**. They are commitments, so I need your yes to publish them.
- The page says how to become a partner, through a contact address you choose.
- Until there's a partner, it shows "No partners or sponsors yet" in plain words. No placeholder
  logos and no "your logo here".
- `docs/partners.md` is written as the plan describes: tiers (left as a heading for you to fill),
  how a logo is added (a pull request to `partners.yml`, with the permission date), and the two
  rules.

### 5. Contributors: credit now, outside contributions after the licence

- The page lists `CONTRIBUTORS.yml`, so a first entry is needed from you (yourself, if you want
  to be listed).
- How to contribute:
  - The repository is public (ADR 0037), so the page links to it.
  - It has no licence yet: the plan says UEW agrees one. Code from outside can't safely be
    accepted until then, so the page says reports and ideas are welcome now, and code
    contributions open once the licence is agreed.
  - The physics reviewer role (CODEOWNERS) is described, for lecturers who want to help.
- A short `CONTRIBUTING.md` at the repository root says the same for people who arrive through
  GitHub.

### 6. Donate: no route, no payment details

The donation route must be agreed with UEW, and isn't yet. The page says, in plain words, that
donations will open once the route is agreed with the university, and points to the partners page
for organisations. **It takes no payment details, links no payment provider, and names no
account.** When you and UEW agree a route, the page gains it in one change.

### 7. Copy, look and performance

The pages use the site's light theme with the shared header and footer, like the experiment
pages. They are static, with no script of their own, and join the accessibility and link tests.
The copy is plain en-GB in sentence case.

### 8. One pull request

Four small pages, three data files with their schema test, `docs/partners.md` and
`CONTRIBUTING.md`. The pull request ticks item 4 and closes Phase 5.

## What I need from you

1. Approval of this brief and the draft board, or changes.
2. For the team page: your name and role as you want them shown, and a photo if you want one.
   Then the same from Dr Acquah, with his agreement.
3. The words for how Physics Anatomy relates to UEW, and whether UEW's name may appear yet.
4. A yes to publishing the two partner rules (decision 4).
5. A contact address for partners and donations, or "none yet".
6. A first entry for `CONTRIBUTORS.yml`, or "leave it empty".

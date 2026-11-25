# Partners, sponsors and donors

How organisations and people who support Physics Anatomy are shown on the site (master plan,
"People joining later"; docs/content/people-pages-brief.md). The page is `/partners`.

## Two rules we keep

1. **No ads are ever shown to students.**
2. **No sponsor has a say in the content.** Experiments, physics, coaching and copy are decided by
   the team and its physics reviewers alone.

Both are stated on `/partners`. A partnership that needs either rule broken is declined.

## Tiers

To be set by Mortey. Until then there is one kind of listing: partner, sponsor or donor, as the
organisation prefers.

## Adding a partner

1. Get written permission to show the organisation's name and logo, and keep it.
2. Add the logo under `apps/web/public/partners/` (SVG, or PNG at least 320 × 128 px).
3. Add an entry to `apps/web/content/partners.yml`: `name`, `kind` (partner, sponsor or donor),
   `logo`, an optional `link`, and `permission`, the date permission was given.
4. Open a pull request. A test refuses an entry without its permission date, and Mortey reviews
   the listing before it merges.

## Donations

The donation route must be agreed with the University of Education, Winneba, and isn't yet.
`/donate` says so. It takes no payment details and links no payment provider until the route is
agreed. Then the route is added to the page in one pull request.

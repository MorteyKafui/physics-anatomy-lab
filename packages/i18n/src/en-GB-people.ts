/**
 * English (en-GB) messages for the people pages: /about, /partners, /contribute and /donate
 * (docs/content/people-pages-brief.md; design/mockups/People.dc.html). Registered by importing
 * "@pa/i18n/people". Nothing here names a person, school or organisation: those come only from
 * the data files Mortey approves. Copy follows AGENTS.md rule 6.
 */
export const enGBPeople = {
  "people.about.title": "The team",
  "people.about.empty": "The team's page is being written.",
  "people.about.empty.about": "Names appear here once each person has agreed to be listed.",
  "people.about.photo": "Photo of {name}",

  "people.partners.title": "Partners and sponsors",
  "people.partners.rules": "Two rules we keep",
  "people.partners.noAds": "No ads are ever shown to students.",
  "people.partners.noSay": "No sponsor has a say in the content.",
  "people.partners.empty": "No partners or sponsors yet.",
  "people.partners.empty.about":
    "Organisations that support the lab are listed here, with their permission.",
  "people.partners.become": "Become a partner",
  "people.partners.become.about":
    "A contact address for partners will be added here. Until then, write to us through GitHub.",
  "people.partners.issues": "Open an issue on GitHub",
  "people.partners.kind.partner": "Partner",
  "people.partners.kind.sponsor": "Sponsor",
  "people.partners.kind.donor": "Donor",
  "people.partners.logo": "{name}'s logo",

  "people.contribute.title": "Contributors",
  "people.contribute.none": "No one is listed yet.",
  "people.contribute.empty":
    "Everyone who has helped will be listed here, in their own words, once they have agreed to be.",
  "people.contribute.how": "How to help",
  "people.contribute.report": "Report a problem or suggest an experiment on GitHub.",
  "people.contribute.review":
    "Lecturers can review the physics: every model and experiment is checked by a physics reviewer before it ships.",
  "people.contribute.code":
    "Code contributions open once the licence is agreed with the University of Education, Winneba.",
  "people.contribute.github": "The code on GitHub",

  "people.donate.title": "Donate",
  "people.donate.free": "Physics Anatomy is free for every student and every school.",
  "people.donate.closed": "Donations open once the route is agreed with the university.",
  "people.donate.closed.about":
    "We'll take gifts only through a route the University of Education, Winneba has agreed.",
  "people.donate.organisations":
    "An organisation that wants to support the lab can become a partner.",
  "people.donate.partners": "Partners and sponsors",

  "people.footer.about": "About",
  "people.footer.team": "The team",
  "people.footer.partners": "Partners and sponsors",
  "people.footer.contribute": "Contribute",
  "people.footer.donate": "Donate",
} as const;

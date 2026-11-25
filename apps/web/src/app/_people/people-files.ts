import contributorsText from "../../../../../CONTRIBUTORS.yml?raw";
import partnersText from "../../../content/partners.yml?raw";
import teamText from "../../../content/team.yml?raw";

import { Contributor, Partner, readList, TeamMember } from "./people-data";

/**
 * The three lists, bundled at build time: the pages render on each request for their CSP nonce,
 * and the server has no files to read. Each is checked when its page module loads, which the
 * build does, so a bad entry still fails the build.
 */
const lists = {
  team: readList("content/team.yml", TeamMember, teamText),
  partners: readList("content/partners.yml", Partner, partnersText),
  contributors: readList("CONTRIBUTORS.yml", Contributor, contributorsText),
};

export const team = () => lists.team;
export const partners = () => lists.partners;
export const contributors = () => lists.contributors;

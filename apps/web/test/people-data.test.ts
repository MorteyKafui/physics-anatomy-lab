import { describe, expect, test } from "bun:test";

import {
  Contributor,
  contributors,
  Partner,
  partners,
  readList,
  team,
  TeamMember,
} from "../src/app/_people/people-data";

// docs/content/people-pages-brief.md, decision 2: nobody on the site without their agreement.
describe("the people pages' data", () => {
  test("the three files parse and pass their schemas as they stand", () => {
    expect(Array.isArray(team())).toBe(true);
    expect(Array.isArray(partners())).toBe(true);
    expect(Array.isArray(contributors())).toBe(true);
  });

  test("a person without the date they agreed is refused", () => {
    expect(() => readList("team.yml", TeamMember, "- name: Ama\n  role: Physics\n")).toThrow(
      /team\.yml/,
    );
    expect(
      readList("team.yml", TeamMember, "- name: Ama\n  role: Physics\n  agreed: 2026-11-25\n"),
    ).toHaveLength(1);
  });

  test("a partner without the date of written permission is refused, and so is an unknown kind", () => {
    const base = "- name: Org\n  kind: sponsor\n  logo: /partners/org.svg\n";
    expect(() => readList("partners.yml", Partner, base)).toThrow(/partners\.yml/);
    expect(readList("partners.yml", Partner, `${base}  permission: 2026-11-25\n`)).toHaveLength(1);
    expect(() =>
      readList(
        "partners.yml",
        Partner,
        base.replace("sponsor", "advertiser") + "  permission: 2026-11-25\n",
      ),
    ).toThrow();
  });

  test("a contributor without the date they agreed is refused", () => {
    expect(() =>
      readList("CONTRIBUTORS.yml", Contributor, "- name: Kofi\n  contribution: Tests\n"),
    ).toThrow();
  });

  test("a logo or photo must be a file on this site, not a link elsewhere", () => {
    const entry =
      "- name: Org\n  kind: partner\n  logo: https://example.org/logo.png\n  permission: 2026-11-25\n";
    expect(() => readList("partners.yml", Partner, entry)).toThrow();
  });
});

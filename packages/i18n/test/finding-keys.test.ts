import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { FINDING_KEYS_FILE, findingKeys } from "../src/finding-keys";

describe("the coach's message keys for the API", () => {
  test("the API's copy is up to date (bun run export:finding-keys)", () => {
    const committed = JSON.parse(readFileSync(FINDING_KEYS_FILE, "utf8")) as string[];
    expect(committed).toEqual(findingKeys());
  });

  test("include the coach's findings", () => {
    const keys = findingKeys();
    expect(keys).toContain("findings.pendulum.countFromOne");
    expect(keys.length).toBeGreaterThan(50);
  });
});

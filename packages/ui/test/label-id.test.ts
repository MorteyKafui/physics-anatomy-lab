import { describe, expect, test } from "bun:test";

import { labelIdFor, labelledBy } from "../src/lib/label-id";

describe("labelledBy", () => {
  test("points a control with an id at its label", () => {
    expect(labelledBy({ id: "ds-repeat" })).toBe(labelIdFor("ds-repeat"));
    expect(labelIdFor("ds-repeat")).toBe("ds-repeat-label");
  });

  test("keeps a name the caller gave", () => {
    expect(labelledBy({ id: "a", "aria-labelledby": "b" })).toBe("b");
    expect(labelledBy({ id: "a", "aria-label": "Lab sounds" })).toBeUndefined();
  });

  test("ignores a blank aria-label, as Base UI does", () => {
    expect(labelledBy({ id: "a", "aria-label": " " })).toBe("a-label");
  });

  test("leaves a control with no id to Base UI", () => {
    expect(labelledBy({})).toBeUndefined();
  });
});

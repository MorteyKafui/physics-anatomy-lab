import { describe, expect, test } from "bun:test";

import { builtTopics } from "../src/app/social-card";

describe("the social card", () => {
  test("its strip shows only topics with an experiment, in the plan's order (no dummy content)", () => {
    expect(builtTopics()).toEqual(["mechanics", "heat", "light", "electricity"]);
  });
});

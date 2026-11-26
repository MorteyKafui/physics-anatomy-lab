import { describe, expect, test } from "bun:test";

import { isApi } from "../pwa/rules";

const ORIGIN = "https://physicsanatomy.example";
const at = (path: string, origin = ORIGIN) => new URL(path, origin);

// The service worker never keeps the API's answers (pwa/rules.ts): they are about a signed-in
// person, and on a shared computer the next person could be served them.
describe("the service worker's API rule", () => {
  test("catches every API call on this origin", () => {
    for (const path of ["/api/auth/me", "/api/export", "/api/sync/pull?after=3", "/api/ai/status"])
      expect(isApi(at(path), ORIGIN), path).toBe(true);
  });

  test("leaves pages, files and other origins alone", () => {
    for (const path of ["/", "/lab/simple-pendulum", "/_next/static/a.js", "/apiary", "/api"])
      expect(isApi(at(path), ORIGIN), path).toBe(false);
    expect(isApi(at("/api/auth/me", "https://other.example"), ORIGIN)).toBe(false);
  });
});

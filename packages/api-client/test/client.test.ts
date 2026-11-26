import { describe, expect, test } from "bun:test";

import { createApi, tokenFromFragment, type Fetch } from "../src";

interface Seen {
  url: string;
  init: RequestInit | undefined;
}

function fakeFetch(status: number, body: unknown, seen: Seen[] = []): Fetch {
  return (url, init) => {
    seen.push({ url, init });
    const text = body === undefined || status === 204 ? null : JSON.stringify(body);
    return Promise.resolve(new Response(text, { status }));
  };
}

describe("api client", () => {
  test("sends cookies and JSON to the API under /api", async () => {
    const seen: Seen[] = [];
    const api = createApi({ fetch: fakeFetch(202, { detail: "Check your email." }, seen) });
    const result = await api.auth.requestEmailLink("ama@example.org");
    expect(result).toEqual({ ok: true, data: { detail: "Check your email." } });
    expect(seen[0]?.url).toBe("/api/auth/email-link");
    expect(seen[0]?.init?.credentials).toBe("include");
    expect(seen[0]?.init?.body).toBe(JSON.stringify({ email: "ama@example.org" }));
  });

  test("gives the API's reason when it refuses", async () => {
    const api = createApi({ fetch: fakeFetch(404, { detail: "We couldn't find that code." }) });
    expect(await api.join.preview("AAA-AAA")).toEqual({
      ok: false,
      status: 404,
      detail: "We couldn't find that code.",
    });
  });

  test("reads the first validation message", async () => {
    const body = { detail: [{ msg: "Value error, Don't use a phone number." }] };
    const api = createApi({ fetch: fakeFetch(422, body) });
    const result = await api.join.join({
      code: "7KQ-42M",
      display_name: "0244123456",
      agreed_to_terms: true,
    });
    expect(result).toEqual({ ok: false, status: 422, detail: "Don't use a phone number." });
  });

  test("says the work is safe when offline", async () => {
    const offline: Fetch = () => Promise.reject(new TypeError("Failed to fetch"));
    const result = await createApi({ fetch: offline }).auth.me();
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(0);
  });

  test("encodes path parts", async () => {
    const seen: Seen[] = [];
    await createApi({ fetch: fakeFetch(204, undefined, seen) }).privacy.removeMember(
      "c 1/x",
      "m?2",
    );
    expect(seen[0]?.url).toBe("/api/classes/c%201%2Fx/members/m%3F2");
  });

  test("a class code goes in the body, never the address", async () => {
    const seen: Seen[] = [];
    await createApi({ fetch: fakeFetch(200, {}, seen) }).join.preview("7KQ-42M");
    expect(seen[0]?.url).toBe("/api/join/preview");
    expect(seen[0]?.init?.method).toBe("POST");
    expect(seen[0]?.init?.body).toBe(JSON.stringify({ code: "7KQ-42M" }));
  });

  test("an error page that is not JSON still gives a reason", async () => {
    const html: Fetch = () =>
      Promise.resolve(new Response("<h1>Bad gateway</h1>", { status: 502 }));
    const result = await createApi({ fetch: html }).auth.me();
    expect(result).toEqual({
      ok: false,
      status: 502,
      detail: "Something went wrong (502). Try again.",
    });
  });

  test("an empty reply, as from sign-out, is fine", async () => {
    const result = await createApi({ fetch: fakeFetch(204, undefined) }).auth.signOut();
    expect(result.ok).toBe(true);
  });
});

describe("sync", () => {
  test("pulls from the start, then after the cursor", async () => {
    const seen: Seen[] = [];
    const page = { attempts: [], events: [], cursor: "7", more: false };
    const api = createApi({ fetch: fakeFetch(200, page, seen) });
    expect(await api.sync.pull(null)).toEqual({ ok: true, data: page });
    await api.sync.pull("7");
    expect(seen.map((s) => s.url)).toEqual(["/api/sync/pull", "/api/sync/pull?after=7"]);
  });

  test("pushes attempts under one key", async () => {
    const seen: Seen[] = [];
    await createApi({ fetch: fakeFetch(200, { attempts: [] }, seen) }).sync.push([]);
    expect(seen[0]?.init?.method).toBe("POST");
    expect(seen[0]?.init?.body).toBe(JSON.stringify({ attempts: [] }));
  });
});

describe("tokenFromFragment", () => {
  test("reads the token from the link's fragment", () => {
    expect(tokenFromFragment("#token=abc_DEF-123")).toBe("abc_DEF-123");
    expect(tokenFromFragment("")).toBeNull();
    expect(tokenFromFragment("#token=")).toBeNull();
  });
});

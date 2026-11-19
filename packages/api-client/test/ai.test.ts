import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  AI_CUT_OFF,
  AI_OFFLINE,
  AI_TOO_SLOW,
  createApi,
  parseAiEvent,
  streamAi,
  type AiEvent,
  type AiStatus,
  type Fetch,
} from "../src";

// Bytes the API's own test (apps/api/tests/test_ai.py) checks it still sends.
const FIXTURE = readFileSync(fileURLToPath(new URL("./fixtures/ai-stream.txt", import.meta.url)), {
  encoding: "utf-8",
});

/** A body that arrives in the given chunks, the way a network splits it. */
function chunked(chunks: readonly string[], fail = false): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  return new ReadableStream({
    pull(controller) {
      const next = chunks[i++];
      if (next !== undefined) controller.enqueue(encoder.encode(next));
      else if (fail) controller.error(new Error("connection reset"));
      else controller.close();
    },
  });
}

function sse(body: ReadableStream<Uint8Array>, status = 200): Fetch {
  return () =>
    Promise.resolve(
      new Response(body, { status, headers: { "content-type": "text/event-stream" } }),
    );
}

async function all(events: AsyncGenerator<AiEvent>): Promise<AiEvent[]> {
  const seen: AiEvent[] = [];
  for await (const event of events) seen.push(event);
  return seen;
}

const REPLY: AiEvent[] = [
  { type: "text", text: "Start counting at " },
  { type: "text", text: "zero. Then T = t / 20 gives " },
  { type: "text", text: "1.806 s." },
  { type: "done", cutShort: false },
];

describe("streamAi", () => {
  test("reads the API's stream, whole", async () => {
    expect(await all(streamAi("/ai/tutor", {}, { fetch: sse(chunked([FIXTURE])) }))).toEqual(REPLY);
  });

  test("reads it however the network splits it, with CRLF and keep-alive comments", async () => {
    const crlf = `: ping\r\n\r\n${FIXTURE.replaceAll("\n", "\r\n")}`;
    const pieces = crlf.match(/[\s\S]{1,7}/g) ?? [];
    expect(await all(streamAi("/ai/tutor", {}, { fetch: sse(chunked(pieces)) }))).toEqual(REPLY);
  });

  test("posts JSON with the cookie to the API under /api", async () => {
    const seen: { url: string; init: RequestInit }[] = [];
    const fetch: Fetch = (url, init) => {
      seen.push({ url, init });
      return sse(chunked([FIXTURE]))(url, init);
    };
    await all(streamAi("/ai/tutor", { student_text: "Why?" }, { fetch }));
    expect(seen[0]?.url).toBe("/api/ai/tutor");
    expect(seen[0]?.init.method).toBe("POST");
    expect(seen[0]?.init.credentials).toBe("include");
    expect(seen[0]?.init.body).toBe(JSON.stringify({ student_text: "Why?" }));
  });

  test("gives the API's reason when it refuses before streaming", async () => {
    const fetch: Fetch = () =>
      Promise.resolve(
        new Response(
          JSON.stringify({ detail: "Your teacher has not turned AI on for this class." }),
          { status: 403 },
        ),
      );
    expect(await all(streamAi("/ai/tutor", {}, { fetch }))).toEqual([
      { type: "error", message: "Your teacher has not turned AI on for this class.", retry: false },
    ]);
  });

  test("says it is offline when the API cannot be reached", async () => {
    const fetch: Fetch = () => Promise.reject(new TypeError("Failed to fetch"));
    expect(await all(streamAi("/ai/tutor", {}, { fetch }))).toEqual([
      { type: "error", message: AI_OFFLINE, retry: true },
    ]);
  });

  test("says the reply was cut off when the connection drops mid-reply", async () => {
    const half = FIXTURE.slice(0, FIXTURE.indexOf("event: done"));
    expect(await all(streamAi("/ai/tutor", {}, { fetch: sse(chunked([half], true)) }))).toEqual([
      ...REPLY.slice(0, 3),
      { type: "error", message: AI_CUT_OFF, retry: true },
    ]);
    expect(await all(streamAi("/ai/tutor", {}, { fetch: sse(chunked([half])) }))).toEqual([
      ...REPLY.slice(0, 3),
      { type: "error", message: AI_CUT_OFF, retry: true },
    ]);
  });

  test("Stop ends the stream quietly", async () => {
    const stop = new AbortController();
    const seen: AiEvent[] = [];
    const fetch: Fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
    const reading = (async () => {
      for await (const event of streamAi("/ai/tutor", {}, { fetch, signal: stop.signal })) {
        seen.push(event);
      }
    })();
    stop.abort();
    await reading;
    expect(seen).toEqual([]);
  });

  test("gives up after the time limit", async () => {
    const fetch: Fetch = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => {
          reject(new DOMException("Timed out", "TimeoutError"));
        });
      });
    expect(await all(streamAi("/ai/tutor", {}, { fetch, timeoutMs: 20 }))).toEqual([
      { type: "error", message: AI_TOO_SLOW, retry: true },
    ]);
  });

  test("ignores events it does not know and stops at the first ending", async () => {
    const body = [
      'event: thinking\ndata: {"text": "hidden"}\n\n',
      'event: refused\ndata: {"message": "No."}\n\n',
      'event: text\ndata: {"text": "never read"}\n\n',
    ];
    expect(await all(streamAi("/ai/tutor", {}, { fetch: sse(chunked(body)) }))).toEqual([
      { type: "refused", message: "No." },
    ]);
  });

  test("parseAiEvent refuses malformed data", () => {
    expect(parseAiEvent("text", "not json")).toBeNull();
    expect(parseAiEvent("done", '{"cut_short": "no"}')).toBeNull();
    expect(parseAiEvent("error", '{"message": "x"}')).toBeNull();
  });
});

describe("api.ai.status", () => {
  test("reads whether AI is available", async () => {
    const status: AiStatus = {
      available: false,
      reason: "signed-out",
      message: "Sign in.",
      features: [],
    };
    const api = createApi({
      fetch: (url) => {
        expect(url).toBe("/api/ai/status");
        return Promise.resolve(new Response(JSON.stringify(status), { status: 200 }));
      },
    });
    expect(await api.ai.status()).toEqual({ ok: true, data: status });
  });
});

describe("streamAi items", () => {
  test("an item comes whole, then done", async () => {
    const item = {
      kind: "scenario",
      title: "The pendulum on the Moon",
      changes: { place: "moon" },
    };
    const body = [
      `event: item\ndata: ${JSON.stringify({ item })}\n\n`,
      'event: done\ndata: {"cut_short": false}\n\n',
    ];
    expect(await all(streamAi("/ai/what-if", {}, { fetch: sse(chunked(body)) }))).toEqual([
      { type: "item", item },
      { type: "done", cutShort: false },
    ]);
  });

  test("an item that is not an object is ignored", () => {
    expect(parseAiEvent("item", '{"item": "moon"}')).toBeNull();
  });
});

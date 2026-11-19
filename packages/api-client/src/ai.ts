// AI replies streamed from the API as Server-Sent Events (ADR 0043). The events mirror
// apps/api/app/ai/stream.py; they are not in OpenAPI, so they are written here by hand, and
// test/fixtures/ai-stream.txt holds bytes the API's own test checks it still sends.
//
// Offline first (AGENTS.md rule 5): nothing in the lab calls this unless a student presses an AI
// button, and every failure ends in a plain sentence, never a thrown error.
import type { Fetch } from "./client";

export type AiEvent =
  /** A piece of the reply, in order. */
  | { readonly type: "text"; readonly text: string }
  /** The reply is complete, or was cut at the length limit. */
  | { readonly type: "done"; readonly cutShort: boolean }
  /** The model declined: discard any text already shown and show the message. */
  | { readonly type: "refused"; readonly message: string }
  /** No reply. `retry` says whether trying again later may help. */
  | { readonly type: "error"; readonly message: string; readonly retry: boolean };

export interface StreamAiOptions {
  readonly baseUrl?: string;
  readonly fetch?: Fetch;
  /** Stop: aborting ends the stream quietly, with no further events. */
  readonly signal?: AbortSignal;
  /** The longest a reply may take, start to finish. */
  readonly timeoutMs?: number;
}

export const AI_TIMEOUT_MS = 100_000; // the API gives up at 90 s; this leaves room for its answer
export const AI_OFFLINE = "AI help is not available right now. The coach still works offline.";
export const AI_TOO_SLOW = "AI help took too long to answer. Try again in a moment.";
export const AI_CUT_OFF = "The reply was cut off. Try again.";

function detailOf(text: string, status: number): string {
  try {
    const body: unknown = JSON.parse(text);
    if (typeof body === "object" && body !== null && "detail" in body) {
      const detail = (body as { detail: unknown }).detail;
      if (typeof detail === "string") return detail;
    }
  } catch {
    // an HTML error page from a proxy, say
  }
  return status >= 500 ? AI_OFFLINE : `Something went wrong (${String(status)}). Try again.`;
}

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

/** One event from its name and data, or null for anything this client does not know. */
export function parseAiEvent(name: string, data: string): AiEvent | null {
  let parsed: Record<string, unknown> | null;
  try {
    parsed = record(JSON.parse(data));
  } catch {
    return null;
  }
  if (parsed === null) return null;
  const { text, cut_short: cutShort, message, retry } = parsed;
  if (name === "text" && typeof text === "string") return { type: "text", text };
  if (name === "done" && typeof cutShort === "boolean") return { type: "done", cutShort };
  if (name === "refused" && typeof message === "string") return { type: "refused", message };
  if (name === "error" && typeof message === "string" && typeof retry === "boolean") {
    return { type: "error", message, retry };
  }
  return null;
}

/** Splits a Server-Sent Events body into (event, data) pairs as the bytes arrive. */
async function* serverSentEvents(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<readonly [string, string]> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n?/g, "\n");
      let end = buffer.indexOf("\n\n");
      while (end !== -1) {
        const block = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        let name = "message";
        const data: string[] = [];
        for (const line of block.split("\n")) {
          if (line.startsWith(":")) continue; // a keep-alive comment
          const colon = line.indexOf(":");
          const field = colon === -1 ? line : line.slice(0, colon);
          const raw = colon === -1 ? "" : line.slice(colon + 1);
          const content = raw.startsWith(" ") ? raw.slice(1) : raw;
          if (field === "event") name = content;
          else if (field === "data") data.push(content);
        }
        if (data.length > 0) yield [name, data.join("\n")];
        end = buffer.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Posts `body` to an AI feature's route and yields the reply as it is written. Ends after one
 * done, refused or error event, or quietly when `signal` aborts.
 */
export async function* streamAi(
  path: string,
  body: unknown,
  options: StreamAiOptions = {},
): AsyncGenerator<AiEvent> {
  const doFetch: Fetch = options.fetch ?? ((url, init) => globalThis.fetch(url, init));
  const timeout = AbortSignal.timeout(options.timeoutMs ?? AI_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([options.signal, timeout]) : timeout;
  const stopped = () => options.signal?.aborted === true;
  const tooSlow: AiEvent = { type: "error", message: AI_TOO_SLOW, retry: true };

  let response: Response;
  try {
    response = await doFetch(`${options.baseUrl ?? "/api"}${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify(body),
      signal,
    });
  } catch {
    if (stopped()) return;
    yield timeout.aborted ? tooSlow : { type: "error", message: AI_OFFLINE, retry: true };
    return;
  }
  if (!response.ok || response.body === null) {
    const status = response.status;
    yield {
      type: "error",
      message: detailOf(await response.text().catch(() => ""), status),
      retry: status === 429 || status >= 500,
    };
    return;
  }

  try {
    for await (const [name, data] of serverSentEvents(response.body)) {
      const event = parseAiEvent(name, data);
      if (event === null) continue;
      yield event;
      if (event.type !== "text") return;
    }
  } catch {
    if (stopped()) return;
    yield timeout.aborted ? tooSlow : { type: "error", message: AI_CUT_OFF, retry: true };
    return;
  }
  if (stopped()) return;
  yield { type: "error", message: AI_CUT_OFF, retry: true };
}

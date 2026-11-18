// The admin portal talks to the API only from its own server (ADR 0040). Cloudflare Access puts
// the signed-in staff member's token on every request that reaches this server; it is passed on,
// unchanged, to the API's /admin routes, which check it. Nothing here runs in the browser.
// `next/headers` makes this module server-only: importing it into a client component fails the build.
import type { StaffMe } from "@pa/api-client";
import { headers } from "next/headers";
import { cache } from "react";

const ACCESS_HEADER = "cf-access-jwt-assertion";

export type Loaded<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly status: number; readonly detail: string };

function apiUrl(): string {
  return process.env.ADMIN_API_URL ?? "http://localhost:8000";
}

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<Loaded<T>> {
  const token = (await headers()).get(ACCESS_HEADER);
  let response: Response;
  try {
    response = await fetch(`${apiUrl()}${path}`, {
      method,
      cache: "no-store",
      headers: {
        ...(token ? { [ACCESS_HEADER]: token } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    return { ok: false, status: 0, detail: "The API cannot be reached from the admin server." };
  }
  const text = await response.text();
  if (!response.ok) {
    let detail = `The API answered ${String(response.status)}.`;
    try {
      const parsed = JSON.parse(text) as { detail?: unknown };
      if (typeof parsed.detail === "string") detail = parsed.detail;
    } catch {
      // not JSON: keep the status line
    }
    return { ok: false, status: response.status, detail };
  }
  const isJson = response.headers.get("content-type")?.includes("json") ?? false;
  return { ok: true, data: (isJson ? JSON.parse(text) : text) as T };
}

export const adminGet = <T>(path: string) => call<T>("GET", path);
export const adminPost = <T>(path: string, body: unknown) => call<T>("POST", path, body);

/** Who is signed in, asked once per request however many parts of the page need it. */
export const staffMe = cache(() => adminGet<StaffMe>("/admin/me"));

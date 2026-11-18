// A small typed client over fetch. The types come from the API's OpenAPI schema
// (src/generated); only the calls are written here, so they keep the repository's strict settings.
//
// Nothing here is on the lab's critical path: the lab works signed out and offline, and these
// calls are made only from sign-in, join and teacher screens.
import type {
  ClassCreate,
  ClassOut,
  ClassUpdate,
  EmailLinkSent,
  JoinPreview,
  JoinRequest,
  MeResponse,
  MemberOut,
  RejoinCodeOut,
  SignInMethods,
  StudentMe,
  TeacherMe,
} from "./generated";

/** What came back: the data, or the status and the API's plain-English reason. */
export type Result<T> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly status: number; readonly detail: string };

/** The part of fetch the client uses, so tests can pass a plain function. */
export type Fetch = (url: string, init: RequestInit) => Promise<Response>;

export interface ApiOptions {
  /** Where the API is mounted. The web app forwards /api to it, so cookies stay same-origin. */
  readonly baseUrl?: string;
  readonly fetch?: Fetch;
}

const OFFLINE = "You're offline. Your work is saved on this device and will sync later.";

function detailOf(body: unknown, status: number): string {
  if (typeof body === "object" && body !== null && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first: unknown = detail[0];
      if (typeof first === "object" && first !== null && "msg" in first) {
        const msg = (first as { msg: unknown }).msg;
        if (typeof msg === "string") return msg.replace(/^Value error, /, "");
      }
    }
  }
  return `Something went wrong (${String(status)}). Try again.`;
}

export function createApi(options: ApiOptions = {}) {
  const baseUrl = options.baseUrl ?? "/api";
  const doFetch: Fetch = options.fetch ?? ((url, init) => globalThis.fetch(url, init));

  async function call<T>(method: string, path: string, body?: unknown): Promise<Result<T>> {
    let response: Response;
    try {
      response = await doFetch(`${baseUrl}${path}`, {
        method,
        credentials: "include",
        headers: body === undefined ? {} : { "Content-Type": "application/json" },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    } catch {
      return { ok: false, status: 0, detail: OFFLINE };
    }
    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = text === "" ? undefined : JSON.parse(text);
    } catch {
      parsed = undefined; // an HTML error page from a proxy, say
    }
    if (!response.ok) {
      return { ok: false, status: response.status, detail: detailOf(parsed, response.status) };
    }
    return { ok: true, data: parsed as T };
  }

  const path = encodeURIComponent;

  return {
    auth: {
      methods: () => call<SignInMethods>("GET", "/auth/methods"),
      me: () => call<MeResponse>("GET", "/auth/me"),
      setName: (displayName: string) =>
        call<TeacherMe>("PATCH", "/auth/me", { display_name: displayName }),
      requestEmailLink: (email: string) =>
        call<EmailLinkSent>("POST", "/auth/email-link", { email }),
      verifyEmailLink: (token: string) =>
        call<TeacherMe>("POST", "/auth/email-link/verify", { token }),
      /** A full-page navigation, not a fetch: Google's pages cannot be fetched. */
      googleStartUrl: () => `${baseUrl}/auth/google/start`,
      signOut: () => call<undefined>("POST", "/auth/sign-out"),
    },
    classes: {
      list: () => call<ClassOut[]>("GET", "/classes"),
      create: (body: ClassCreate) => call<ClassOut>("POST", "/classes", body),
      get: (id: string) => call<ClassOut>("GET", `/classes/${path(id)}`),
      update: (id: string, body: ClassUpdate) =>
        call<ClassOut>("PATCH", `/classes/${path(id)}`, body),
      rotateCode: (id: string) => call<ClassOut>("POST", `/classes/${path(id)}/code`),
      members: (id: string) => call<MemberOut[]>("GET", `/classes/${path(id)}/members`),
      issueRejoinCode: (id: string, memberId: string) =>
        call<RejoinCodeOut>("POST", `/classes/${path(id)}/members/${path(memberId)}/rejoin-code`),
    },
    join: {
      preview: (code: string) => call<JoinPreview>("GET", `/join/${path(code)}`),
      join: (body: JoinRequest) => call<StudentMe>("POST", "/join", body),
      rejoin: (code: string) => call<StudentMe>("POST", "/join/rejoin", { code }),
    },
  };
}

export type Api = ReturnType<typeof createApi>;

/** The email link's token, read from the page's fragment (#token=…), which never reaches a server. */
export function tokenFromFragment(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, "")).get("token");
  return token === null || token === "" ? null : token;
}

// A small typed client over fetch. The types come from the API's OpenAPI schema
// (src/generated); only the calls are written here, so they keep the repository's strict settings.
//
// Nothing here is on the lab's critical path: the lab works signed out and offline, and these
// calls are made only from sign-in, join and teacher screens, and from AI buttons.
import type {
  AiStatus,
  ApprovedQuestion,
  QuestionOut,
  Submission,
  AttemptBatch,
  AttemptEventsPage,
  ClassAttempt,
  ClassMistake,
  LiveMessageOut,
  LiveSessionOut,
  LiveSnapshot,
  LiveStart,
  StepCount,
  ClassCreate,
  ClassOut,
  ConsentChoice,
  ConsentsOut,
  ExportAttemptsPage,
  StudentExport,
  TeacherExport,
  ClassUpdate,
  EmailLinkSent,
  JoinPreview,
  JoinRequest,
  MeResponse,
  MemberOut,
  PullResult,
  PushResult,
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
  const query = (params: Record<string, string | null | undefined>) => {
    const pairs = Object.entries(params).filter(
      (p): p is [string, string] => p[1] !== undefined && p[1] !== null,
    );
    return pairs.length === 0 ? "" : `?${new URLSearchParams(pairs).toString()}`;
  };

  return {
    /** Whether to show AI buttons, and why not (ADR 0043). Replies stream with streamAi(). */
    ai: {
      status: () => call<AiStatus>("GET", "/ai/status"),
    },
    /** The question bank (docs/content/ai-questions-brief.md). Drafting streams with streamAi(). */
    questions: {
      submit: (body: Submission) => call<QuestionOut[]>("POST", "/questions", body),
      mine: () => call<QuestionOut[]>("GET", "/questions/mine"),
      approved: (experimentId: string) =>
        call<ApprovedQuestion[]>(
          "GET",
          `/questions/approved${query({ experiment_id: experimentId })}`,
        ),
    },
    auth: {
      methods: () => call<SignInMethods>("GET", "/auth/methods"),
      me: () => call<MeResponse>("GET", "/auth/me"),
      setName: (displayName: string) =>
        call<TeacherMe>("PATCH", "/auth/me", { display_name: displayName }),
      /** `turnstileToken` from the page's Turnstile widget, when Turnstile is on. */
      requestEmailLink: (email: string, turnstileToken?: string | null) =>
        call<EmailLinkSent>("POST", "/auth/email-link", {
          email,
          ...(turnstileToken ? { turnstile_token: turnstileToken } : {}),
        }),
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
    /** A teacher's reads of their own class (ADR 0041). */
    teacher: {
      attempts: (classId: string, experimentId?: string) =>
        call<ClassAttempt[]>(
          "GET",
          `/classes/${path(classId)}/attempts${query({ experiment_id: experimentId })}`,
        ),
      events: (classId: string, attemptId: string, after: string | null = null) =>
        call<AttemptEventsPage>(
          "GET",
          `/classes/${path(classId)}/attempts/${path(attemptId)}/events${query({ after })}`,
        ),
      mistakes: (classId: string, experimentId?: string) =>
        call<ClassMistake[]>(
          "GET",
          `/classes/${path(classId)}/mistakes${query({ experiment_id: experimentId })}`,
        ),
      progress: (classId: string, experimentId: string) =>
        call<StepCount[]>(
          "GET",
          `/classes/${path(classId)}/progress${query({ experiment_id: experimentId })}`,
        ),
    },
    /** Live classes: the teacher's commands. The board listens on `liveSocketUrl`. */
    live: {
      get: (classId: string) => call<LiveSnapshot>("GET", `/classes/${path(classId)}/live`),
      start: (classId: string, body: LiveStart) =>
        call<LiveSessionOut>("POST", `/classes/${path(classId)}/live`, body),
      end: (classId: string) => call<LiveSessionOut>("POST", `/classes/${path(classId)}/live/end`),
      lock: (classId: string, locked: boolean) =>
        call<LiveSessionOut>("PUT", `/classes/${path(classId)}/live/lock`, { locked }),
      pushHint: (classId: string, rule: string, key: string) =>
        call<LiveMessageOut>("POST", `/classes/${path(classId)}/live/hints`, { rule, key }),
      broadcast: (classId: string, text: string) =>
        call<LiveMessageOut>("POST", `/classes/${path(classId)}/live/broadcast`, { text }),
      note: (classId: string, memberId: string, text: string) =>
        call<LiveMessageOut>("POST", `/classes/${path(classId)}/live/notes`, {
          member_id: memberId,
          text,
        }),
      undo: (classId: string, messageId: number) =>
        call<LiveMessageOut>(
          "POST",
          `/classes/${path(classId)}/live/messages/${String(messageId)}/undo`,
        ),
    },
    /**
     * Event sync (ADR 0039). The engine's syncAccount drives these in the background; the lab
     * never waits on them.
     */
    sync: {
      push: (attempts: AttemptBatch[]) => call<PushResult>("POST", "/sync/push", { attempts }),
      pull: (after: string | null) =>
        call<PullResult>(
          "GET",
          after === null ? "/sync/pull" : `/sync/pull?after=${encodeURIComponent(after)}`,
        ),
    },
    /** Consent, export and deletion (ADR 0042). */
    privacy: {
      consents: () => call<ConsentsOut>("GET", "/consents"),
      choose: (body: ConsentChoice) => call<ConsentsOut>("POST", "/consents", body),
      exportMine: () => call<TeacherExport | StudentExport>("GET", "/export"),
      exportMyAttempts: (after: string | null = null) =>
        call<ExportAttemptsPage>("GET", `/export/attempts${query({ after })}`),
      exportMember: (classId: string, memberId: string) =>
        call<StudentExport>("GET", `/classes/${path(classId)}/members/${path(memberId)}/export`),
      exportMemberAttempts: (classId: string, memberId: string, after: string | null = null) =>
        call<ExportAttemptsPage>(
          "GET",
          `/classes/${path(classId)}/members/${path(memberId)}/export/attempts${query({ after })}`,
        ),
      deleteAccount: (confirmEmail: string) =>
        call<undefined>("POST", "/account/delete", { confirm_email: confirmEmail }),
      leaveClass: (confirmDisplayName: string) =>
        call<undefined>("POST", "/account/leave", { confirm_display_name: confirmDisplayName }),
      deleteClass: (classId: string, confirmName: string) =>
        call<undefined>("POST", `/classes/${path(classId)}/delete`, { confirm_name: confirmName }),
      removeMember: (classId: string, memberId: string) =>
        call<undefined>("DELETE", `/classes/${path(classId)}/members/${path(memberId)}`),
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

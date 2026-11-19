// The API calls the journeys make, shaped as the web app makes them.

import http from "k6/http";
import { check } from "k6";
import { ADDRESS_HEADER, API_URL, WEB_ORIGIN } from "./profiles.js";

const JSON_HEADERS = { "Content-Type": "application/json", Origin: WEB_ORIGIN };
const SESSION_COOKIES = ["pa_session", "__Host-pa_session"];

function post(path, body, name, extra = {}) {
  return http.post(`${API_URL}${path}`, JSON.stringify(body), {
    headers: { ...JSON_HEADERS, ...(extra.headers || {}) },
    tags: { name },
    jar: extra.jar,
    responseCallback: extra.responseCallback,
  });
}

function sessionCookie(response) {
  for (const name of SESSION_COOKIES) {
    const found = response.cookies[name];
    if (found && found.length > 0) return { name, value: found[0].value };
  }
  return null;
}

/** The Cookie header for this VU's session, for sockets (k6 sends the jar only with http). */
export function cookieHeader() {
  const cookies = http.cookieJar().cookiesForURL(API_URL);
  return SESSION_COOKIES.filter((n) => cookies[n] && cookies[n].length > 0)
    .map((n) => `${n}=${cookies[n][0]}`)
    .join("; ");
}

/** Use a session made in setup() in this VU. */
export function useSession(session) {
  http.cookieJar().set(API_URL, session.name, session.value);
}

/**
 * A teacher signs in by email link. Locally the link is read back from the API's in-memory
 * outbox through the test-only route, which exists only when ENVIRONMENT is local or test.
 */
export function signInTeacher(email, address) {
  const jar = new http.CookieJar();
  const headers = ADDRESS_HEADER ? { [ADDRESS_HEADER]: address } : {};
  const asked = post("/auth/email-link", { email }, "email-link", { headers, jar });
  check(asked, { "email link sent": (r) => r.status === 202 }) ||
    fail(`email link: ${asked.status} ${asked.body}`);
  const link = http.get(`${API_URL}/test-only/sign-in-link?email=${encodeURIComponent(email)}`, {
    tags: { name: "test-only-link" },
    jar,
  });
  check(link, { "link read back": (r) => r.status === 200 }) ||
    fail(
      `The test-only link route answered ${link.status}. Run the API with ENVIRONMENT=local ` +
        "and EMAIL_DELIVERY=log, one process (docs/ops/load-testing.md).",
    );
  const verified = post("/auth/email-link/verify", { token: link.json("token") }, "verify", {
    headers,
    jar,
  });
  check(verified, { "teacher signed in": (r) => r.status === 200 }) ||
    fail(`verify: ${verified.status} ${verified.body}`);
  const session = sessionCookie(verified);
  if (!session) fail("Signing in set no session cookie.");
  return session;
}

/** Requests as a teacher whose session came from setup(), in setup's own jar. */
export function asTeacher(session) {
  const jar = new http.CookieJar();
  jar.set(API_URL, session.name, session.value);
  return {
    createClass(name) {
      const made = post("/classes", { name, school_permission_confirmed: true }, "create-class", {
        jar,
      });
      check(made, { "class created": (r) => r.status === 201 }) ||
        fail(`create class: ${made.status} ${made.body}`);
      return made.json();
    },
    startLive(classId, experimentId, lessonMinutes) {
      const started = post(
        `/classes/${classId}/live`,
        { experiment_id: experimentId, lesson_minutes: lessonMinutes },
        "live-start",
        { jar },
      );
      check(started, { "live class started": (r) => r.status === 200 }) ||
        fail(`start live: ${started.status} ${started.body}`);
    },
    endLive(classId) {
      // 404 when it already ended: fine at teardown.
      return post(`/classes/${classId}/live/end`, {}, "live-end", {
        jar,
        responseCallback: http.expectedStatuses(200, 404),
      });
    },
  };
}

export function broadcast(classId, text) {
  return post(`/classes/${classId}/live/broadcast`, { text }, "broadcast");
}

export function liveSnapshot(classId) {
  return http.get(`${API_URL}/classes/${classId}/live`, { tags: { name: "live-snapshot" } });
}

/** A student joins with the class code and a display name; the session lands in the VU's jar. */
export function join(code, displayName) {
  const joined = post("/join", { code, display_name: displayName, agreed_to_terms: true }, "join");
  return check(joined, { "student joined": (r) => r.status === 201 });
}

export function push(attempts) {
  return post("/sync/push", { attempts }, "push");
}

export function pull(after) {
  const query = after ? `?after=${encodeURIComponent(after)}` : "";
  return http.get(`${API_URL}/sync/pull${query}`, { tags: { name: "pull" } });
}

function fail(message) {
  throw new Error(message);
}

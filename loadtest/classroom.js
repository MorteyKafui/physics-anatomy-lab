// The classroom load test: teachers run live classes while their students work, sync and listen.
// How to run it and read it: docs/ops/load-testing.md.
//
//   k6 run loadtest/classroom.js                      # smoke profile, local API on :8000
//   k6 run -e PROFILE=full -e API_URL=… loadtest/classroom.js
//
// setup()   teachers sign in by email link, each creates a class and starts a live session.
// teacher   one per live class: the board's socket, a broadcast every BROADCAST_EVERY seconds,
//           and the snapshot read once a minute, as the board does (ADR 0041).
// student   joins a class with its code and a display name, then lesson after lesson: records
//           events, syncs them (push, then pull) every SYNC_EVERY seconds and, in a live class,
//           keeps the student socket open, sending bench summaries and heartbeats.
// teardown  ends the live sessions.

import exec from "k6/execution";
import { check } from "k6";
import { Counter, Rate, Trend } from "k6/metrics";
import { clearInterval, setInterval, setTimeout } from "k6/timers";
import { WebSocket } from "k6/websockets";
import * as api from "./lib/api.js";
import { Attempt, newDevice } from "./lib/attempt.js";
import { EXPERIMENTS, WEB_ORIGIN, WS_URL, profile } from "./lib/profiles.js";
import { thresholds } from "./lib/targets.js";

const P = profile();

// A student's delivery time for a teacher's broadcast: from just before the teacher's request
// to the student's socket receiving it. Teacher and student are different VUs; on one machine
// they share a clock, and on k6 Cloud load generators are NTP-synced (docs/ops/load-testing.md).
const messageMs = new Trend("live_message_ms", true);
// The same broadcast arriving back on the teacher's own board: one VU, one clock.
const echoMs = new Trend("live_teacher_echo_ms", true);
const socketOk = new Rate("live_socket_ok");
const messagesReceived = new Counter("live_messages_received");

const TEST_SECONDS = P.RAMP_UP + P.HOLD + P.RAMP_DOWN;
const BROADCAST_PREFIX = "Load test broadcast sent at ";
// Closing codes a client expects: normal, or going away.
const NORMAL_CLOSE = new Set([1000, 1001, 1005]);

export const options = {
  setupTimeout: `${Math.max(120, P.CLASSES * 3)}s`,
  teardownTimeout: "120s",
  thresholds,
  scenarios: {
    ...(P.LIVE_CLASSES > 0 && {
      teachers: {
        executor: "per-vu-iterations",
        exec: "teacher",
        vus: P.LIVE_CLASSES,
        iterations: 1,
        maxDuration: `${TEST_SECONDS + 60}s`,
      },
    }),
    students: {
      executor: "ramping-vus",
      exec: "student",
      startVUs: 0,
      stages: [
        { duration: `${P.RAMP_UP}s`, target: P.STUDENTS },
        { duration: `${P.HOLD}s`, target: P.STUDENTS },
        { duration: `${P.RAMP_DOWN}s`, target: 0 },
      ],
      // A lesson under way when its VU is stopped finishes, so its events are verified.
      gracefulRampDown: `${P.LESSON + 30}s`,
      gracefulStop: `${P.LESSON + 30}s`,
    },
  },
};

export function setup() {
  const run = Date.now().toString(36);
  const classes = [];
  for (let i = 0; i < P.CLASSES; i += 1) {
    const address = `10.${(i >> 16) & 255}.${(i >> 8) & 255}.${i & 255}`;
    const session = api.signInTeacher(`teacher-${run}-${i}@load.example`, address);
    const teacher = api.asTeacher(session);
    const made = teacher.createClass(`Load test ${run} class ${i + 1}`);
    const live = i < P.LIVE_CLASSES;
    const experimentId = EXPERIMENTS[i % EXPERIMENTS.length];
    if (live)
      teacher.startLive(made.id, experimentId, Math.min(240, Math.ceil(TEST_SECONDS / 60) + 5));
    classes.push({ id: made.id, code: made.code, session, live, experimentId });
  }
  return { run, classes };
}

export function teardown(data) {
  for (const c of data.classes) if (c.live) api.asTeacher(c.session).endLive(c.id);
}

// The teacher's board

export function teacher(data) {
  const live = data.classes.filter((c) => c.live);
  const mine = live[exec.scenario.iterationInTest % live.length];
  api.useSession(mine.session);
  const sent = new Map();

  const socket = new WebSocket(`${WS_URL}/live/classes/${mine.id}/teacher`, null, {
    headers: { Origin: WEB_ORIGIN, Cookie: api.cookieHeader() },
    tags: { name: "teacher-socket" },
  });
  const timers = [];
  socket.onopen = () => {
    timers.push(setInterval(() => socket.send(JSON.stringify({ type: "ping" })), 25_000));
    timers.push(
      setInterval(() => {
        const at = Date.now();
        const reply = api.broadcast(mine.id, `${BROADCAST_PREFIX}${at}`);
        if (check(reply, { "broadcast sent": (r) => r.status === 200 }))
          sent.set(reply.json("id"), at);
      }, P.BROADCAST_EVERY * 1000),
    );
    timers.push(setInterval(() => api.liveSnapshot(mine.id), 60_000));
    setTimeout(() => {
      timers.forEach(clearInterval);
      socket.close();
    }, TEST_SECONDS * 1000);
  };
  socket.onmessage = (event) => {
    const frame = JSON.parse(event.data);
    if (frame.type === "message" && sent.has(frame.message.id)) {
      echoMs.add(Date.now() - sent.get(frame.message.id));
      sent.delete(frame.message.id);
    }
  };
  let failed = false;
  socket.onerror = () => {
    failed = true;
  };
  socket.onclose = (event) => {
    timers.forEach(clearInterval);
    const code = event && event.code;
    socketOk.add(!failed && (code === undefined || NORMAL_CLOSE.has(code)));
  };
}

// A student's device

let me = null; // per VU: joined once, then one lesson per iteration

function joinOnce(data) {
  if (me) return me;
  const mine = data.classes[(exec.vu.idInTest - 1) % data.classes.length];
  // Display names are kind names, never contact details (ADR 0011).
  if (!api.join(mine.code, `Student ${exec.vu.idInTest}`)) return null;
  me = { school: mine, device: newDevice(), cursor: 0 };
  return me;
}

export function student(data) {
  const student = joinOnce(data);
  if (!student) return;
  const { school } = student;
  const attempt = new Attempt(school.experimentId, student.device);
  const timers = [];
  let ended = false;
  const end = (socket) => {
    if (ended) return;
    ended = true;
    timers.forEach(clearInterval);
    attempt.finish();
    if (socket) socket.close();
  };

  const work = () => {
    timers.push(setInterval(() => attempt.record(), P.EVENT_EVERY * 1000));
    // Spread the syncs so a class does not arrive at once.
    setTimeout(
      () => timers.push(setInterval(() => attempt.sync(), P.SYNC_EVERY * 1000)),
      Math.random() * P.SYNC_EVERY * 1000,
    );
  };

  if (!school.live) {
    work();
    setTimeout(() => end(null), P.LESSON * 1000);
    return;
  }

  const socket = new WebSocket(`${WS_URL}/live/student`, null, {
    headers: { Origin: WEB_ORIGIN, Cookie: api.cookieHeader() },
    tags: { name: "student-socket" },
  });
  let openedAt = Infinity;
  let failed = false;
  socket.onopen = () => {
    openedAt = Date.now();
    socket.send(JSON.stringify({ type: "hello", after: student.cursor }));
    work();
    timers.push(setInterval(() => socket.send(JSON.stringify({ type: "ping" })), 25_000));
    timers.push(
      setInterval(() => {
        socket.send(
          JSON.stringify({
            type: "bench",
            attempt_id: attempt.header.id,
            experiment_id: school.experimentId,
            step: "measure",
            completed: ["question", "predict", "build", "check"],
            mistakes: [],
            readings: attempt.events.length,
          }),
        );
      }, P.BENCH_EVERY * 1000),
    );
    setTimeout(() => end(socket), P.LESSON * 1000);
  };
  socket.onmessage = (event) => {
    const frame = JSON.parse(event.data);
    if (frame.type === "state") student.cursor = frame.cursor || student.cursor;
    if (frame.type !== "message") return;
    messagesReceived.add(1);
    student.cursor = Math.max(student.cursor, frame.message.id);
    const text = frame.message.data && frame.message.data.text;
    if (typeof text === "string" && text.startsWith(BROADCAST_PREFIX)) {
      // Catch-up on connect resends messages sent before it; time only the ones sent since.
      const sentAt = Number(text.slice(BROADCAST_PREFIX.length));
      if (sentAt >= openedAt) messageMs.add(Date.now() - sentAt);
    }
  };
  socket.onerror = () => {
    failed = true;
  };
  socket.onclose = (event) => {
    const code = event && event.code;
    socketOk.add(!failed && (ended || code === undefined || NORMAL_CLOSE.has(code)));
    end(null);
  };
}

// The run fails when a target is missed (k6 exits non-zero).
//
// From the master plan, "Scale, performance and observability":
// - API availability of 99.9%: under 0.1% of requests fail, and of live sockets.
// - Classroom messages delivered in 300 ms or less (p95, same region).
// - Zero synced events lost: every event the API accepted comes back in a pull.
//
// The plan gives no response-time target for plain requests. The ones marked "proposed" are this
// test's own budgets, for Mortey to confirm or change; they are here so a slow API shows up.

export const thresholds = {
  // Plan targets
  http_req_failed: ["rate<0.001"],
  live_socket_ok: ["rate>0.999"],
  live_message_ms: ["p(95)<300"],
  sync_events_lost: ["count<1"],
  checks: ["rate>0.999"],

  // Proposed budgets
  "http_req_duration{name:join}": ["p(95)<1000"],
  "http_req_duration{name:push}": ["p(95)<1000"],
  "http_req_duration{name:pull}": ["p(95)<1000"],
  "http_req_duration{name:broadcast}": ["p(95)<500"],
};

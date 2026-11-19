// @pa/api-client: the API's types, generated from its OpenAPI schema so both languages share one
// contract, and a small typed client over fetch. Regenerate with `bun run generate`.
export type * from "./generated";
export { AI_CUT_OFF, AI_OFFLINE, AI_TIMEOUT_MS, AI_TOO_SLOW, parseAiEvent, streamAi } from "./ai";
export type { AiEvent, StreamAiOptions } from "./ai";
export { createApi, tokenFromFragment } from "./client";
export { collectExport, exportFileName } from "./privacy";
export type { ExportFile } from "./privacy";
export type { Api, ApiOptions, Fetch, Result } from "./client";
export { FINAL_CLOSE_CODES, LIVE, LiveSocket, liveSocketUrl, StudentLive } from "./live";
export type {
  BenchSummary,
  Clock,
  LiveSocketOptions,
  LiveStatus,
  SocketFactory,
  SocketLike,
  StepName,
  StudentFrame,
  StudentLiveOptions,
  StudentLiveSession,
  StudentMessage,
  TeacherFrame,
} from "./live";

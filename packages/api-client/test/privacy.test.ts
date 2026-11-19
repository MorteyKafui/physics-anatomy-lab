import { describe, expect, test } from "bun:test";

import { collectExport, exportFileName, type Result } from "../src";
import type { ExportAttemptsPage, StudentExport } from "../src/generated";

const SUMMARY = {
  format: "physics-anatomy/export",
  version: 1,
  kind: "student",
  exported_at: "2026-11-19T10:00:00Z",
  display_name: "Kofi_A",
  class_name: "Example class",
  teacher_name: null,
  joined_at: "2026-11-18T10:00:00Z",
  consents: [],
  attempts: 3,
} as StudentExport;

function file(id: string) {
  return {
    format: "physics-anatomy/attempt",
    version: 1,
    attempt: {
      id,
      experimentId: "simple-pendulum",
      mode: "guided",
      seed: 1,
      createdAt: 0,
      updatedAt: 0,
      formatVersion: 1,
    },
    events: [],
  } as ExportAttemptsPage["attempts"][number];
}

describe("collectExport", () => {
  test("follows the cursor and joins every page after the summary", async () => {
    const pages: Record<string, ExportAttemptsPage> = {
      "": { attempts: [file("a"), file("b")], cursor: "2", more: true },
      "2": { attempts: [file("c")], cursor: "3", more: false },
    };
    const asked: (string | null)[] = [];
    const result = await collectExport(
      () => Promise.resolve({ ok: true, data: SUMMARY }),
      (after) => {
        asked.push(after);
        return Promise.resolve({ ok: true, data: pages[after ?? ""] as ExportAttemptsPage });
      },
    );
    expect(asked).toEqual([null, "2"]);
    expect(result.ok && result.data.attempt_files.map((f) => f.attempt.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(result.ok && result.data.display_name).toBe("Kofi_A");
  });

  test("tries a dropped page again, and gives up on a refusal", async () => {
    let calls = 0;
    const flaky = await collectExport(
      () => Promise.resolve({ ok: true, data: SUMMARY }),
      (): Promise<Result<ExportAttemptsPage>> => {
        calls++;
        return Promise.resolve(
          calls < 3
            ? { ok: false, status: 0, detail: "offline" }
            : { ok: true, data: { attempts: [], cursor: "", more: false } },
        );
      },
    );
    expect(flaky.ok).toBe(true);
    const refused = await collectExport(
      () => Promise.resolve({ ok: false, status: 401, detail: "Sign in first." }),
      () => Promise.reject(new Error("never asked")),
    );
    expect(refused).toEqual({ ok: false, status: 401, detail: "Sign in first." });
  });
});

test("the file name carries the day and a safe name", () => {
  expect(exportFileName("2026-11-19T10:00:00Z")).toBe("physics-anatomy-data-2026-11-19.json");
  expect(exportFileName("2026-11-19T10:00:00Z", "Kofi A/x")).toBe(
    "physics-anatomy-Kofi_A_x-2026-11-19.json",
  );
});

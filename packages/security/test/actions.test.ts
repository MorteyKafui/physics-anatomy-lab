import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Master plan, controls table, "Supply chain": GitHub Actions pinned by commit SHA. A tag can be
// moved to other code after we start using it; a commit cannot. Renovate keeps the pins current
// (`helpers:pinGitHubActionDigests` in renovate.json), and the comment names the release.

const WORKFLOWS = join(import.meta.dir, "../../../.github/workflows");
const PINNED = /^[\w.-]+\/[\w./-]+@[0-9a-f]{40} # v\d+\.\d+\.\d+$/;

const uses = readdirSync(WORKFLOWS)
  .filter((f) => /\.ya?ml$/.test(f))
  .flatMap((f) =>
    readFileSync(join(WORKFLOWS, f), "utf8")
      .split("\n")
      .map((line, i) => ({
        where: `${f}:${i + 1}`,
        m: /^\s*(?:-\s*)?uses:\s*(.+?)\s*$/.exec(line),
      }))
      .filter((u) => u.m)
      .map((u) => ({ where: u.where, ref: u.m![1]! })),
  );

describe("GitHub Actions", () => {
  test("the workflows use some", () => {
    expect(uses.length).toBeGreaterThan(0);
  });

  test("every one is pinned to a full commit SHA, with its release in a comment", () => {
    const loose = uses.filter((u) => !u.ref.startsWith("./") && !PINNED.test(u.ref));
    expect(loose.map((u) => `${u.where}: ${u.ref}`)).toEqual([]);
  });
});

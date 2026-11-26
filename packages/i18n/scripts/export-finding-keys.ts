// Writes the coach's message keys for the API: bun run export:finding-keys (ASVS review, finding H).
import { writeFileSync } from "node:fs";

import { FINDING_KEYS_FILE, findingKeys } from "../src/finding-keys";

writeFileSync(FINDING_KEYS_FILE, `${JSON.stringify(findingKeys(), null, 2)}\n`);
console.log(`Wrote ${findingKeys().length} keys to ${FINDING_KEYS_FILE.pathname}`);

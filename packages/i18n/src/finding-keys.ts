// The coach's message keys, for the API (ASVS review, finding H). A bench frame from a student's
// device names its mistakes by key; the API accepts only keys this catalogue words, so a teacher's
// board only ever shows the lab's own wording. A finding's key K is worded as `K.title` and
// `K.detail` (packages/analysis, Finding). Not imported by the apps: the export script and its
// test read it.
import { enGB } from "./en-GB";
import { enGBAccess } from "./en-GB-access";
import { enGBCatalogue } from "./en-GB-catalogue";
import { enGBConvergingLens } from "./en-GB-converging-lens";
import { enGBFlag } from "./en-GB-flag";
import { enGBLanding } from "./en-GB-landing";
import { enGBMethodOfMixtures } from "./en-GB-method-of-mixtures";
import { enGBOhmsLaw } from "./en-GB-ohms-law";
import { enGBPeople } from "./en-GB-people";
import { enGBPrivacy } from "./en-GB-privacy";
import { enGBReview } from "./en-GB-review";
import { enGBTeach } from "./en-GB-teach";
import { enGBTutor } from "./en-GB-tutor";
import { enGBWhatIf } from "./en-GB-what-if";

const ALL: readonly Record<string, string>[] = [
  enGB,
  enGBAccess,
  enGBCatalogue,
  enGBConvergingLens,
  enGBFlag,
  enGBLanding,
  enGBMethodOfMixtures,
  enGBOhmsLaw,
  enGBPeople,
  enGBPrivacy,
  enGBReview,
  enGBTeach,
  enGBTutor,
  enGBWhatIf,
];

/** Every key K with both `K.title` and `K.detail`, sorted. */
export function findingKeys(): string[] {
  const known = new Set(ALL.flatMap((m) => Object.keys(m)));
  return [...known]
    .filter((k) => k.endsWith(".title"))
    .map((k) => k.slice(0, -".title".length))
    .filter((k) => known.has(`${k}.detail`))
    .sort();
}

export const FINDING_KEYS_FILE = new URL(
  "../../../apps/api/app/live/finding_keys.json",
  import.meta.url,
);

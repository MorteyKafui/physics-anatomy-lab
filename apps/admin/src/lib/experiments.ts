// The experiments, as the lab defines them (packages/experiments), with their titles from the
// message files. Nothing here is typed in: ids, versions and topics come from the definitions.
import {
  convergingLens,
  hotSolid,
  lensPins,
  methodOfMixtures,
  ohmsLaw,
  simplePendulum,
} from "@pa/experiments";
import { hasMessage, t, type MessageKey } from "@pa/i18n";
// Each lab registers its own messages; the portal names every experiment, so it registers all.
import "@pa/i18n/converging-lens";
import "@pa/i18n/method-of-mixtures";
import "@pa/i18n/ohms-law";
import type { Topic } from "@pa/ui";

export interface ExperimentInfo {
  readonly id: string;
  readonly version: number;
  readonly topic: Topic;
  readonly title: string;
  /** One of the four flagship experiments (ADR 0001). */
  readonly flagship: boolean;
}

const FLAGSHIPS: ReadonlySet<string> = new Set([
  simplePendulum.id,
  ohmsLaw.id,
  convergingLens.id,
  methodOfMixtures.id,
]);

export const EXPERIMENTS: readonly ExperimentInfo[] = [
  simplePendulum,
  ohmsLaw,
  convergingLens,
  lensPins,
  methodOfMixtures,
  hotSolid,
].map((e) => ({
  id: e.id,
  version: e.version,
  topic: e.topic as Topic,
  title: titleOf(e.id),
  flagship: FLAGSHIPS.has(e.id),
}));

export function titleOf(id: string): string {
  const key = `experiments.${id}.title`;
  return hasMessage(key) ? t(key) : id;
}

export const experiment = (id: string) => EXPERIMENTS.find((e) => e.id === id);

/** A mistake's name, as the coach words it to students, or its key if it has no message yet. */
export function mistakeName(hint: string): string {
  const key = `findings.${hint}.title`;
  return hasMessage(key) ? t(key as MessageKey, {}).replace(/\*\*/g, "") : hint;
}

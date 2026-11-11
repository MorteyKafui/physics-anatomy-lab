// @pa/i18n: message files for on-screen text and spoken lines. English first; Twi, Ga and Ewe
// later (decision D10).
import { enGB, type MessageKey as SharedKey } from "./en-GB";
import type { enGBConvergingLens } from "./en-GB-converging-lens";
import type { enGBOhmsLaw } from "./en-GB-ohms-law";

export { enGB };

/**
 * Every message key, the shared ones and each experiment's own. An experiment's messages are in
 * their own file, registered by importing its entry ("@pa/i18n/ohms-law") in that lab only, so
 * the other labs and the app shell do not download them.
 */
export type MessageKey = SharedKey | keyof typeof enGBOhmsLaw | keyof typeof enGBConvergingLens;

const messages: Record<string, string> = { ...enGB };

/** Register an experiment's messages. Called by its entry module, once. */
export function addMessages(more: Readonly<Record<string, string>>) {
  Object.assign(messages, more);
}

export type Params = Readonly<Record<string, string | number>>;

/**
 * The message for a key, with {placeholders} filled in. A missing placeholder is left visible as
 * {name}, so a gap shows up in testing rather than as an empty space.
 */
export function t(key: MessageKey, params: Params = {}): string {
  // An experiment's message whose file is not registered shows as its key, so it is seen.
  return (messages[key] ?? key).replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

/** A finding or refusal key, which may or may not have a message yet. */
export function hasMessage(key: string): key is MessageKey {
  return key in messages;
}

/** Split a message into plain and **emphasised** runs, for rendering. */
export function emphasis(text: string): { text: string; strong: boolean }[] {
  return text
    .split(/(\*\*[^*]+\*\*)/)
    .filter(Boolean)
    .map((part) =>
      part.startsWith("**") && part.endsWith("**")
        ? { text: part.slice(2, -2), strong: true }
        : { text: part, strong: false },
    );
}

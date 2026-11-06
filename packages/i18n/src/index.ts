// @pa/i18n: message files for on-screen text and spoken lines. English first; Twi, Ga and Ewe
// later (decision D10).
import { enGB, type MessageKey } from "./en-GB";

export { enGB };
export type { MessageKey };

export type Params = Readonly<Record<string, string | number>>;

/**
 * The message for a key, with {placeholders} filled in. A missing placeholder is left visible as
 * {name}, so a gap shows up in testing rather than as an empty space.
 */
export function t(key: MessageKey, params: Params = {}): string {
  return enGB[key].replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

/** A finding or refusal key, which may or may not have a message yet. */
export function hasMessage(key: string): key is MessageKey {
  return key in enGB;
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

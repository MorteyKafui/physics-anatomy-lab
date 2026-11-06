/**
 * The spoken coach (master plan, "Audio mode: the coach you can hear"). It reads each step,
 * speaks every correction the coach raises, and, if asked to, says everything the lab shows.
 * Captions carry every line, so it works in a silent classroom too.
 *
 * Speech goes through an engine the lab passes in: the browser's own speech engine today, which
 * works offline (rule 5); a neural voice for the scripted lines once the voice provider spike
 * has chosen one. Nothing records the student's voice (D19).
 */

/** How much the coach says aloud. */
export const VERBOSITY = ["mistakes", "steps", "everything"] as const;
export type Verbosity = (typeof VERBOSITY)[number];

/** What a line is: a correction always matters most, then a step's instructions, then the rest. */
export type LineKind = "correction" | "step" | "status";

/** Speeds the plan offers: 0.75× to 1.5×. */
export const RATES = [0.75, 1, 1.25, 1.5] as const;

export interface AudioSettings {
  /** Sound is off until the student turns it on (classrooms start muted). */
  on: boolean;
  verbosity: Verbosity;
  rate: (typeof RATES)[number];
  /** The chosen voice, by the engine's id; undefined picks one. */
  voice: string | undefined;
  /** Volume of each layer, 0 to 1. */
  voiceVolume: number;
  countVolume: number;
  soundsVolume: number;
  /** Count the oscillations aloud while timing. */
  countAlong: boolean;
}

export const DEFAULT_AUDIO: AudioSettings = {
  on: false,
  verbosity: "steps",
  rate: 1,
  voice: undefined,
  voiceVolume: 1,
  countVolume: 0.7,
  soundsVolume: 0.5,
  countAlong: true,
};

const unit = (v: unknown, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;

/** Settings read back from storage, each field checked; anything odd falls back to the default. */
export function parseAudioSettings(raw: unknown): AudioSettings {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    on: typeof r.on === "boolean" ? r.on : DEFAULT_AUDIO.on,
    verbosity: (VERBOSITY as readonly unknown[]).includes(r.verbosity)
      ? (r.verbosity as Verbosity)
      : DEFAULT_AUDIO.verbosity,
    rate: (RATES as readonly unknown[]).includes(r.rate)
      ? (r.rate as AudioSettings["rate"])
      : DEFAULT_AUDIO.rate,
    voice: typeof r.voice === "string" && r.voice.length <= 200 ? r.voice : undefined,
    voiceVolume: unit(r.voiceVolume, DEFAULT_AUDIO.voiceVolume),
    countVolume: unit(r.countVolume, DEFAULT_AUDIO.countVolume),
    soundsVolume: unit(r.soundsVolume, DEFAULT_AUDIO.soundsVolume),
    countAlong: typeof r.countAlong === "boolean" ? r.countAlong : DEFAULT_AUDIO.countAlong,
  };
}

/** Does a line of this kind get spoken at this verbosity? Corrections always do. */
export function shouldSpeak(kind: LineKind, verbosity: Verbosity): boolean {
  if (kind === "correction") return true;
  if (kind === "step") return verbosity !== "mistakes";
  return verbosity === "everything";
}

export interface Voice {
  id: string;
  name: string;
  /** BCP 47, such as en-GB. */
  lang: string;
}

/** A speech engine: the browser's, or a test's. */
export interface SpeechEngine {
  voices(): Voice[];
  speak(line: { text: string; rate: number; volume: number; voice: string | undefined }): void;
  cancel(): void;
}

/**
 * The voice to speak with: the student's choice if the engine has it; otherwise British English
 * (the app's language, en-GB), then any English, then whatever the engine offers.
 */
export function chooseVoice(voices: readonly Voice[], preferred?: string): Voice | undefined {
  return (
    voices.find((v) => v.id === preferred) ??
    voices.find((v) => v.lang.toLowerCase() === "en-gb") ??
    voices.find((v) => v.lang.toLowerCase().startsWith("en")) ??
    voices[0]
  );
}

export interface Speaker {
  /**
   * Say a line, if the settings allow. A correction interrupts whatever is being said; other
   * lines queue. Returns whether it was spoken, so the caption can show it either way.
   */
  say(text: string, kind: LineKind): boolean;
  /** Say one number of the count-along: always short, always interrupting the last one. */
  count(text: string): boolean;
  stop(): void;
}

export function createSpeaker(
  engine: SpeechEngine | undefined,
  settings: () => AudioSettings,
): Speaker {
  let last: string | undefined;
  const speak = (text: string, volume: number, interrupt: boolean) => {
    const s = settings();
    if (!engine || !s.on || text.trim() === "") return false;
    if (interrupt) engine.cancel();
    engine.speak({ text, rate: s.rate, volume, voice: chooseVoice(engine.voices(), s.voice)?.id });
    return true;
  };
  return {
    say(text, kind) {
      const s = settings();
      if (!s.on || !shouldSpeak(kind, s.verbosity)) return false;
      // The same line twice in a row (a status set again) is said once.
      if (text === last) return false;
      last = text;
      return speak(text, s.voiceVolume, kind === "correction");
    },
    count(text) {
      const s = settings();
      if (!s.countAlong) return false;
      return speak(text, s.countVolume, true);
    },
    stop() {
      last = undefined;
      engine?.cancel();
    },
  };
}

/** The browser's own speech engine, when there is one (it works offline). */
export function browserSpeech(): SpeechEngine | undefined {
  const synth = typeof window === "undefined" ? undefined : window.speechSynthesis;
  if (!synth || typeof SpeechSynthesisUtterance === "undefined") return undefined;
  return {
    voices: () => synth.getVoices().map((v) => ({ id: v.voiceURI, name: v.name, lang: v.lang })),
    speak({ text, rate, volume, voice }) {
      const u = new SpeechSynthesisUtterance(text);
      u.rate = rate;
      u.volume = volume;
      u.lang = "en-GB";
      const v = synth.getVoices().find((x) => x.voiceURI === voice);
      if (v) u.voice = v;
      synth.speak(u);
    },
    cancel: () => synth.cancel(),
  };
}

"use client";

import {
  browserSpeech,
  createLabSounds,
  createSpeaker,
  parseAudioSettings,
  shouldSpeak,
  type AudioSettings,
  type LabSound,
  type LineKind,
  type Voice,
} from "@pa/audio";
import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "pa:audio";

/** Sound settings are this device's convenience, kept in local storage (AGENTS.md). */
function load(): AudioSettings {
  try {
    const raw = window.localStorage.getItem(KEY);
    return parseAudioSettings(raw ? JSON.parse(raw) : null);
  } catch {
    return parseAudioSettings(null);
  }
}

/**
 * The lab's audio: the spoken coach with captions, the count-along and the lab sounds. Every
 * line is captioned while sound is on, even when this browser cannot speak.
 */
export function useAudio() {
  const [settings, setSettings] = useState<AudioSettings>(load);
  const [caption, setCaption] = useState<string>();
  const englishVoices = () =>
    (browserSpeech()?.voices() ?? []).filter((v) => v.lang.startsWith("en"));
  const [voices, setVoices] = useState<Voice[]>(() =>
    typeof window === "undefined" ? [] : englishVoices(),
  );
  const [canSpeak] = useState(() => typeof window !== "undefined" && browserSpeech() !== undefined);
  const current = useRef(settings);
  const tools = useRef<{
    speaker: ReturnType<typeof createSpeaker>;
    sounds: ReturnType<typeof createLabSounds>;
  }>(undefined);

  useEffect(() => {
    current.current = settings;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(settings));
    } catch {
      // Storage blocked: the settings last for this visit.
    }
    if (!settings.on) tools.current?.speaker.stop();
  }, [settings]);

  useEffect(() => {
    const engine = browserSpeech();
    tools.current = {
      speaker: createSpeaker(engine, () => current.current),
      sounds: createLabSounds(),
    };
    if (!engine) return;
    // Voices arrive after the page loads in most browsers.
    const refresh = () => setVoices(engine.voices().filter((v) => v.lang.startsWith("en")));
    window.speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", refresh);
      window.speechSynthesis.cancel();
    };
  }, []);

  const say = useCallback((text: string, kind: LineKind) => {
    const s = current.current;
    if (!s.on || !text || !shouldSpeak(kind, s.verbosity)) return;
    tools.current?.speaker.say(text, kind);
    setCaption(text);
  }, []);

  // Read aloud, pressed by the student: speaks even with the coach's voice off, at their
  // speed and volume, with the line as the caption.
  const read = useCallback((text: string) => {
    if (!text) return;
    tools.current?.speaker.say(text, "correction");
    setCaption(text);
  }, []);

  const count = useCallback((text: string) => {
    const s = current.current;
    if (!s.on || !s.countAlong) return;
    tools.current?.sounds.play("beat", s.countVolume);
    tools.current?.speaker.count(text);
    setCaption(text);
  }, []);

  const sound = useCallback((which: LabSound) => {
    const s = current.current;
    if (s.on) tools.current?.sounds.play(which, s.soundsVolume);
  }, []);

  // The new settings count at once, not after the next render's effects: the lab frame speaks
  // from its own effect, which runs before this hook's (a child's effects run first).
  const update = useCallback((change: Partial<AudioSettings>) => {
    current.current = { ...current.current, ...change };
    setSettings((s) => ({ ...s, ...change }));
  }, []);

  return { settings, update, say, read, count, sound, caption, voices, canSpeak };
}

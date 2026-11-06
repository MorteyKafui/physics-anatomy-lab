import { describe, expect, test } from "bun:test";
import fc from "fast-check";

import {
  chooseVoice,
  createSpeaker,
  DEFAULT_AUDIO,
  LAB_SOUNDS,
  parseAudioSettings,
  shouldSpeak,
  SOUND_RECIPES,
  soundLength,
  type AudioSettings,
  type SpeechEngine,
} from "../src";

function fakeEngine() {
  const said: { text: string; rate: number; volume: number; voice: string | undefined }[] = [];
  let cancels = 0;
  const engine: SpeechEngine = {
    voices: () => [
      { id: "us", name: "US", lang: "en-US" },
      { id: "gb", name: "GB", lang: "en-GB" },
    ],
    speak: (line) => said.push(line),
    cancel: () => (cancels += 1),
  };
  return { engine, said, cancels: () => cancels };
}

const on = (over: Partial<AudioSettings> = {}): AudioSettings => ({
  ...DEFAULT_AUDIO,
  on: true,
  ...over,
});

describe("the spoken coach", () => {
  test("is silent until sound is turned on", () => {
    const { engine, said } = fakeEngine();
    const speaker = createSpeaker(engine, () => DEFAULT_AUDIO);
    expect(speaker.say("Set up the pendulum", "step")).toBe(false);
    expect(said).toEqual([]);
  });

  test("says corrections always, steps unless only mistakes, and the rest only when asked", () => {
    expect(
      ["mistakes", "steps", "everything"].map((v) => shouldSpeak("correction", v as never)),
    ).toEqual([true, true, true]);
    expect(["mistakes", "steps", "everything"].map((v) => shouldSpeak("step", v as never))).toEqual(
      [false, true, true],
    );
    expect(
      ["mistakes", "steps", "everything"].map((v) => shouldSpeak("status", v as never)),
    ).toEqual([false, false, true]);
  });

  test("speaks in British English at the chosen speed, a correction cutting in", () => {
    const { engine, said, cancels } = fakeEngine();
    const speaker = createSpeaker(engine, () => on({ rate: 1.25 }));
    speaker.say("Set up the pendulum", "step");
    expect(cancels()).toBe(0);
    speaker.say('You said "one" on the first pass', "correction");
    expect(cancels()).toBe(1);
    expect(said.map((l) => [l.text, l.rate, l.voice])).toEqual([
      ["Set up the pendulum", 1.25, "gb"],
      ['You said "one" on the first pass', 1.25, "gb"],
    ]);
  });

  test("says a repeated line once, and counts along only when that layer is on", () => {
    const { engine, said } = fakeEngine();
    let settings = on();
    const speaker = createSpeaker(engine, () => settings);
    speaker.say("You put the base plate on the bench.", "correction");
    speaker.say("You put the base plate on the bench.", "correction");
    expect(said).toHaveLength(1);
    expect(speaker.count("1")).toBe(true);
    settings = on({ countAlong: false });
    expect(speaker.count("2")).toBe(false);
    expect(said.map((l) => l.text)).toEqual(["You put the base plate on the bench.", "1"]);
  });

  test("works with no speech engine at all", () => {
    const speaker = createSpeaker(undefined, () => on());
    expect(speaker.say("Hello", "correction")).toBe(false);
  });
});

describe("voices and settings", () => {
  test("the student's voice, else British English, else any English", () => {
    const voices = [
      { id: "fr", name: "FR", lang: "fr-FR" },
      { id: "us", name: "US", lang: "en-US" },
    ];
    expect(chooseVoice(voices)?.id).toBe("us");
    expect(chooseVoice([...voices, { id: "gb", name: "GB", lang: "en-GB" }])?.id).toBe("gb");
    expect(chooseVoice(voices, "fr")?.id).toBe("fr");
    expect(chooseVoice([])).toBeUndefined();
  });

  test("settings read back from storage are checked, whatever was stored", () => {
    expect(parseAudioSettings(null)).toEqual(DEFAULT_AUDIO);
    expect(parseAudioSettings({ on: true, rate: 1.5, voiceVolume: 7 })).toMatchObject({
      on: true,
      rate: 1.5,
      voiceVolume: 1,
    });
    fc.assert(
      fc.property(fc.anything(), (raw) => {
        const s = parseAudioSettings(raw);
        return [s.voiceVolume, s.countVolume, s.soundsVolume].every((v) => v >= 0 && v <= 1);
      }),
    );
  });
});

describe("the lab sounds", () => {
  test("are short, and never louder than the layer allows", () => {
    for (const sound of LAB_SOUNDS) {
      expect(soundLength(sound)).toBeLessThan(0.5);
      for (const tone of SOUND_RECIPES[sound]) {
        expect(tone.gain).toBeGreaterThan(0);
        expect(tone.gain).toBeLessThanOrEqual(1);
      }
    }
  });
});

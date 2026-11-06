/**
 * Lab sounds, synthesised in the browser with Web Audio, so they work offline and cost nothing to
 * download (master plan, "Lab sounds"; built on Physics Bench's synthesised sounds). Each sound is
 * a recipe of short tones or noise bursts; `playSound` turns a recipe into audio.
 */

export const LAB_SOUNDS = ["stopwatch", "beat", "swish"] as const;
export type LabSound = (typeof LAB_SOUNDS)[number];

export interface Tone {
  /** A plain wave, or filtered noise for things that rush (a swish). */
  wave: "sine" | "square" | "triangle" | "noise";
  /** Hz; for noise, the centre of its band. */
  frequency: number;
  /** Where the pitch slides to by the end, Hz. */
  endFrequency?: number;
  /** When it starts after the sound begins, s. */
  delay: number;
  /** How long it lasts, s. */
  duration: number;
  /** Its loudest, 0 to 1, before the layer's volume. */
  gain: number;
}

export const SOUND_RECIPES: Readonly<Record<LabSound, readonly Tone[]>> = {
  // A digital stopwatch's button: a short, bright click.
  stopwatch: [
    { wave: "square", frequency: 2400, delay: 0, duration: 0.015, gain: 0.25 },
    { wave: "sine", frequency: 1200, delay: 0.004, duration: 0.03, gain: 0.2 },
  ],
  // The count-along's soft beat, under the spoken number.
  beat: [{ wave: "sine", frequency: 880, endFrequency: 660, delay: 0, duration: 0.09, gain: 0.3 }],
  // The bob rushing through the air at the bottom of its swing.
  swish: [
    { wave: "noise", frequency: 700, endFrequency: 350, delay: 0, duration: 0.28, gain: 0.12 },
  ],
};

/** How long a sound lasts, s. */
export const soundLength = (sound: LabSound) =>
  Math.max(...SOUND_RECIPES[sound].map((t) => t.delay + t.duration));

/** A second of white noise, shared by every noise tone. */
function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Play a lab sound now (or `at` the context's time), at a volume from 0 to 1. */
export function playSound(ctx: BaseAudioContext, sound: LabSound, volume: number, at?: number) {
  if (volume <= 0) return;
  const start = at ?? ctx.currentTime;
  for (const tone of SOUND_RECIPES[sound]) {
    const t0 = start + tone.delay;
    const t1 = t0 + tone.duration;
    const gain = ctx.createGain();
    // A fast attack and a smooth fall, so nothing clicks but the click.
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(tone.gain * volume, t0 + Math.min(0.005, tone.duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.0001, t1);
    gain.connect(ctx.destination);
    if (tone.wave === "noise") {
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(ctx);
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.setValueAtTime(tone.frequency, t0);
      if (tone.endFrequency) band.frequency.exponentialRampToValueAtTime(tone.endFrequency, t1);
      src.connect(band).connect(gain);
      src.start(t0);
      src.stop(t1);
    } else {
      const osc = ctx.createOscillator();
      osc.type = tone.wave;
      osc.frequency.setValueAtTime(tone.frequency, t0);
      if (tone.endFrequency) osc.frequency.exponentialRampToValueAtTime(tone.endFrequency, t1);
      osc.connect(gain);
      osc.start(t0);
      osc.stop(t1);
    }
  }
}

/**
 * The lab's sound player. Its audio context is made on first use, which a browser allows only
 * after the student has pressed something (turning sound on does it).
 */
export function createLabSounds() {
  let ctx: AudioContext | undefined;
  return {
    play(sound: LabSound, volume: number) {
      if (typeof window === "undefined" || typeof AudioContext === "undefined") return;
      ctx ??= new AudioContext();
      if (ctx.state === "suspended") void ctx.resume();
      playSound(ctx, sound, volume);
    },
  };
}

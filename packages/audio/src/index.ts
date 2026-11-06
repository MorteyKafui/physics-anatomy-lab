// @pa/audio: the audio mode (D19). The spoken coach with captions, the count-along and the
// synthesised lab sounds, all offline. No recording of the student's voice.
export {
  browserSpeech,
  chooseVoice,
  createSpeaker,
  DEFAULT_AUDIO,
  parseAudioSettings,
  RATES,
  shouldSpeak,
  VERBOSITY,
} from "./speaker";
export type { AudioSettings, LineKind, SpeechEngine, Speaker, Verbosity, Voice } from "./speaker";
export { createLabSounds, LAB_SOUNDS, playSound, SOUND_RECIPES, soundLength } from "./sounds";
export type { LabSound, Tone } from "./sounds";

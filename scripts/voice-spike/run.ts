/**
 * The voice provider spike (docs/planning/voice-provider-spike.md). Generates the script's thirty
 * lines with each provider whose key is in scripts/voice-spike/.env, then writes a blind
 * listening page and a ratings sheet to scripts/voice-spike/out/ (git-ignored).
 *
 *   bun scripts/voice-spike/run.ts
 *
 * Keys stay in the .env file on this computer; nothing here prints them. Only our own scripted
 * text is sent, never anything a student wrote (AGENTS.md rule 4).
 */
import { join } from "node:path";

import { LINES, scriptCharacters } from "./lines";

const HERE = import.meta.dir;
const OUT = join(HERE, "out");

/** Read KEY=value lines from the spike's own .env, so it works from any folder. */
async function loadEnv(): Promise<Record<string, string>> {
  const file = Bun.file(join(HERE, ".env"));
  if (!(await file.exists())) return {};
  const env: Record<string, string> = {};
  for (const line of (await file.text()).split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !line.trimStart().startsWith("#")) env[m[1]!] = m[2]!.replace(/^["']|["']$/g, "");
  }
  return env;
}

interface VoiceRun {
  provider: string;
  voice: string;
  locale: string;
  synth: (text: string) => Promise<Uint8Array>;
}

const xml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const list = (v: string | undefined) =>
  (v ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/** Microsoft Azure Speech: Ghanaian English if it has any, then Nigerian and British English. */
async function azure(env: Record<string, string>): Promise<VoiceRun[]> {
  const key = env.AZURE_SPEECH_KEY;
  const region = env.AZURE_SPEECH_REGION;
  if (!key || !region) return [];
  const base = `https://${region}.tts.speech.microsoft.com/cognitiveservices`;
  const headers = { "Ocp-Apim-Subscription-Key": key, "User-Agent": "physics-anatomy-voice-spike" };
  const res = await fetch(`${base}/voices/list`, { headers });
  if (!res.ok) throw new Error(`Azure voices: ${res.status} ${await res.text()}`);
  const all = (await res.json()) as { ShortName: string; Locale: string }[];
  const wanted = list(env.AZURE_VOICES);
  const pick = wanted.length
    ? all.filter((v) => wanted.includes(v.ShortName))
    : [
        ...all.filter((v) => v.Locale === "en-GH"),
        ...all.filter((v) => v.Locale === "en-NG").slice(0, 2),
        ...all.filter((v) => v.Locale === "en-GB").slice(0, 2),
      ];
  console.log(
    `Azure: ${all.filter((v) => v.Locale === "en-GH").length} Ghanaian English voice(s) listed`,
  );
  return pick.map((v) => ({
    provider: "Azure",
    voice: v.ShortName,
    locale: v.Locale,
    async synth(text) {
      const r = await fetch(`${base}/v1`, {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/ssml+xml",
          "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        },
        body: `<speak version="1.0" xml:lang="${v.Locale}"><voice name="${v.ShortName}">${xml(text)}</voice></speak>`,
      });
      if (!r.ok) throw new Error(`Azure ${v.ShortName}: ${r.status}`);
      return new Uint8Array(await r.arrayBuffer());
    },
  }));
}

/** Google Cloud Text-to-Speech: Ghanaian or Nigerian English if listed, then British English. */
async function google(env: Record<string, string>): Promise<VoiceRun[]> {
  const key = env.GOOGLE_TTS_API_KEY;
  if (!key) return [];
  const api = "https://texttospeech.googleapis.com/v1";
  const res = await fetch(`${api}/voices?key=${encodeURIComponent(key)}`);
  if (!res.ok) throw new Error(`Google voices: ${res.status} ${await res.text()}`);
  const all = ((await res.json()) as { voices: { name: string; languageCodes: string[] }[] })
    .voices;
  const has = (code: string) => all.filter((v) => v.languageCodes.includes(code));
  const wanted = list(env.GOOGLE_VOICES);
  const british = has("en-GB").filter((v) => /Neural2|Wavenet|Chirp/.test(v.name));
  const pick = wanted.length
    ? all.filter((v) => wanted.includes(v.name))
    : [...has("en-GH"), ...has("en-NG").slice(0, 2), ...british.slice(0, 2)];
  console.log(`Google: ${has("en-GH").length} Ghanaian English voice(s) listed`);
  return pick.map((v) => ({
    provider: "Google",
    voice: v.name,
    locale: v.languageCodes[0]!,
    async synth(text) {
      const r = await fetch(`${api}/text:synthesize?key=${encodeURIComponent(key)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: { languageCode: v.languageCodes[0], name: v.name },
          audioConfig: { audioEncoding: "MP3" },
        }),
      });
      if (!r.ok) throw new Error(`Google ${v.name}: ${r.status}`);
      const { audioContent } = (await r.json()) as { audioContent: string };
      return Uint8Array.from(atob(audioContent), (c) => c.charCodeAt(0));
    },
  }));
}

/**
 * GhanaNLP's Khaya: Twi, Ewe and Ga. The calls follow its MIT-licensed SDK
 * (github.com/Khaya-AI/khaya-sdk): the key in the Ocp-Apim-Subscription-Key header,
 * POST /v1/translate {in, lang} and POST /tts/v1/tts {text, language, speaker_id}, which returns
 * WAV. We have no Twi, Ewe or Ga copy yet, so a few lines are machine-translated first; the page
 * says so, and a native speaker judges both the words and the voice.
 */
const KHAYA_LANGUAGES = [
  { name: "Asante Twi", pair: "en-tw", tts: "twi" },
  { name: "Ewe", pair: "en-ee", tts: "ewe" },
  { name: "Ga", pair: "en-gaa", tts: "gaa" },
] as const;
const KHAYA_LINES = ["start", "count-from-one", "thread-clamp", "count-0", "count-7", "symbol-g"];

interface LocalClip {
  language: string;
  /** BCP 47 code for the page: tw, ee, gaa. */
  code: string;
  line: string;
  english: string;
  translated: string;
  file: string;
}

async function khaya(env: Record<string, string>): Promise<LocalClip[]> {
  const key = env.KHAYA_API_KEY;
  if (!key) return [];
  const base = "https://translation-api.ghananlp.org";
  const headers = { "Ocp-Apim-Subscription-Key": key, "Content-Type": "application/json" };
  const clips: LocalClip[] = [];
  for (const lang of KHAYA_LANGUAGES) {
    for (const id of KHAYA_LINES) {
      const line = LINES.find((l) => l.id === id)!;
      const tr = await fetch(`${base}/v1/translate`, {
        method: "POST",
        headers,
        body: JSON.stringify({ in: line.text, lang: lang.pair }),
      });
      if (!tr.ok) throw new Error(`Khaya translate ${lang.pair}: ${tr.status}`);
      const raw = await tr.text();
      // The API answers with the translation as a JSON string (or plain text).
      let translated = raw;
      try {
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed === "string") translated = parsed;
      } catch {
        // Plain text: keep it as it came.
      }
      const tts = await fetch(`${base}/tts/v1/tts`, {
        method: "POST",
        headers,
        body: JSON.stringify({ text: translated, language: lang.tts, speaker_id: "female" }),
      });
      if (!tts.ok) throw new Error(`Khaya speech ${lang.tts}: ${tts.status}`);
      const file = `clips/khaya-${lang.tts}/${id}.wav`;
      await Bun.write(join(OUT, file), new Uint8Array(await tts.arrayBuffer()));
      clips.push({
        language: lang.name,
        code: lang.pair.split("-")[1]!,
        line: id,
        english: line.text,
        translated,
        file,
      });
    }
    console.log(`Khaya ${lang.name}: ${KHAYA_LINES.length} lines`);
  }
  return clips;
}

/** Shuffle with a fixed seed, so the blind labels are the same every run. */
function shuffled<T>(items: T[], seed = 20261106): T[] {
  const out = [...items];
  let s = seed;
  for (let i = out.length - 1; i > 0; i -= 1) {
    s = (s * 1103515245 + 12345) % 2 ** 31;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

async function main() {
  const env = await loadEnv();
  const runs = [...(await azure(env)), ...(await google(env))];
  const local = await khaya(env);
  if (runs.length === 0 && local.length === 0) {
    console.log("No provider keys in scripts/voice-spike/.env. Copy .env.example and add one.");
  }
  const voices = shuffled(runs).map((r, i) => ({ ...r, label: `Voice ${i + 1}` }));
  const results: unknown[] = [];
  for (const v of voices) {
    let bytes = 0;
    const started = performance.now();
    for (const line of LINES) {
      const audio = await v.synth(line.text);
      bytes += audio.length;
      await Bun.write(join(OUT, "clips", v.label.replace(" ", "-"), `${line.id}.mp3`), audio);
    }
    results.push({
      label: v.label,
      provider: v.provider,
      voice: v.voice,
      locale: v.locale,
      characters: scriptCharacters(),
      bytes,
      seconds: Math.round((performance.now() - started) / 100) / 10,
    });
    console.log(`${v.label}: ${LINES.length} lines, ${Math.round(bytes / 1024)} KB`);
  }
  // The key that unblinds the labels, kept apart from the page the panel sees.
  await Bun.write(join(OUT, "key.json"), JSON.stringify(results, null, 2));
  await Bun.write(join(OUT, "ratings.csv"), ratingsSheet(voices.map((v) => v.label)));
  await Bun.write(
    join(OUT, "listening.html"),
    listeningPage(
      voices.map((v) => v.label),
      local,
    ),
  );
  console.log(`Script: ${LINES.length} lines, ${scriptCharacters()} characters per voice.`);
  console.log(`Wrote ${join(OUT, "listening.html")}`);
}

function ratingsSheet(labels: string[]): string {
  const rows = [
    "line,voice,clarity (1-5),sounds natural to a Ghanaian listener (1-5),says units well (1-5)",
  ];
  for (const line of LINES)
    for (const label of [...labels, "Device voice"]) rows.push(`${line.id},${label},,,`);
  return `${rows.join("\n")}\n`;
}

/** One page: each line, then each voice's clip, and the listening device's own voice to compare. */
function listeningPage(labels: string[], local: LocalClip[]): string {
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const body = LINES.map(
    (line) =>
      `<section><h2>${esc(line.id)}</h2><p>${esc(line.text)}</p><ul>${labels
        .map(
          (l) =>
            `<li>${l} <audio controls preload="none" src="clips/${l.replace(" ", "-")}/${line.id}.mp3"></audio></li>`,
        )
        .join(
          "",
        )}<li>Device voice <button type="button" data-say="${esc(line.text)}">Play</button></li></ul></section>`,
  ).join("\n");
  return `<!doctype html><html lang="en-GB"><meta charset="utf-8"><title>Voice spike: listening</title>
<style>body{font:16px system-ui;max-width:52rem;margin:2rem auto;padding:0 1rem}section{border-top:1px solid #ccc;padding:.5rem 0}li{margin:.25rem 0}</style>
<h1>Voice spike: listen and rate</h1><p>Rate each voice in ratings.csv. The labels are shuffled; do not open key.json until the ratings are in.</p>
${body}
${
  local.length
    ? `<h1>Twi, Ewe and Ga (machine-translated)</h1><p>These lines were translated by machine for this test only. A native speaker judges the words and the voice; neither goes into the app as it is.</p>${local
        .map(
          (c) =>
            `<section><h2>${esc(c.language)} · ${esc(c.line)}</h2><p>${esc(c.english)}</p><p lang="${c.code}">${esc(c.translated)}</p><audio controls preload="none" src="${c.file}"></audio></section>`,
        )
        .join("\n")}`
    : ""
}
<script>document.addEventListener("click",e=>{const t=e.target.closest("[data-say]");if(!t)return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t.dataset.say);u.lang="en-GB";speechSynthesis.speak(u);});</script></html>`;
}

await main();

# Voice provider spike (Phase 1)

The master plan ("Audio mode: the coach you can hear") asks for a neural voice for the coach's
scripted lines, generated at build time and cached so it plays offline, with the browser's own
speech engine as the fallback for dynamic text. This spike chooses the provider, judged on voice
quality for Ghanaian English, cost, and a path to Twi, Ga and Ewe.

**Status: paused (November 2026).** The harness is ready in
[`scripts/voice-spike/`](../../scripts/voice-spike/README.md): it generates the script with Azure,
Google and GhanaNLP Khaya from keys in a git-ignored `.env`, and writes a blind listening page.
Running it needs accounts with those services, which only Mortey can create, and sends our scripted
text to them; Mortey chose to wait. The lab speaks with the browser's own voice meanwhile.

## What ships today

The spoken coach in the lab speaks with the **browser's own speech engine** (Web Speech API),
which costs nothing and works offline. Voices depend on the device: most laptops and phones offer
a British or American English voice; few, if any, offer a Ghanaian English one. Captions carry
every line, so the coach is usable with any voice or none.

## Candidates

What the spike found (searches, November 2026). Each "check" is a claim to confirm on the
provider's own pages before deciding.

| Provider                               | Ghanaian English                                                                                                                                        | Twi, Ga, Ewe                                                                                     | Build-time use                       | Notes                                                                                                                                             |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser speech engine                  | Rarely                                                                                                                                                  | No                                                                                               | Not needed                           | Already in use; free; offline; quality varies by device                                                                                           |
| Microsoft Azure Speech (neural TTS)    | No en-GH voice confirmed; Nigerian English (en-NG) voices are listed. Check the voice gallery. Custom Neural Voice is an option with our own recordings | Check                                                                                            | Yes (batch synthesis to audio files) | Large voice catalogue                                                                                                                             |
| Google Cloud Text-to-Speech            | No en-GH voice confirmed; English accents listed include British, American, Australian, Indian. Check the voices page                                   | Not for Cloud TTS (Google's Twi support announced in 2024 was for voice input in other products) | Yes                                  |                                                                                                                                                   |
| GhanaNLP Khaya API                     | Not its focus                                                                                                                                           | Yes: its TTS guide covers Asante Twi, Ga and Ewe, with male and female speakers                  | Yes                                  | API key from ghananlp.org; a per-request character limit, so long lines are split; language codes differ between its ASR and TTS ("tw" and "twi") |
| An open-source model run at build time | Check                                                                                                                                                   | Check                                                                                            | Yes, with no outside service         | No text leaves our machines; quality and licences to check                                                                                        |

Sources: [Microsoft neural TTS languages](https://techcommunity.microsoft.com/t5/azure-ai/azure-speech-s-neural-tts-empowers-organizations-to-serve-users/ba-p/2920882),
[Google Cloud TTS release notes](https://docs.cloud.google.com/text-to-speech/docs/release-notes),
[Google developer forum on African-language TTS](https://discuss.google.dev/t/text-to-speech-in-african-languages/377634),
[Google's 2024 African-language announcement](https://lifestyleandtech.co.za/ai-cloud/article/2024-10-29/google-announces-15-more-african-languages-across-voice-search-and-more),
[Khaya SDK text-to-speech guide](https://khaya-sdk.readthedocs.io/en/latest/guides/tts/).

## How the spike runs

1. **Script.** Thirty lines from `packages/i18n/src/en-GB.ts`: step instructions, corrections
   (count from one, thread on the clamp, a mean short of a decimal place), numbers with units
   ("4.03 s² m⁻¹", "9.80 m s⁻²") and the count-along, 0 to 20.
2. **Generate** each line with each shortlisted provider at its best English voice, and with the
   browser engine on a typical school laptop and the benchmark phone.
3. **Listen, blind.** A panel of SHS students and teachers in Ghana rates each clip from 1 to 5
   for clarity, how natural it sounds to a Ghanaian listener, and how well it says units and
   symbols. No recordings of the panel are made (D19).
4. **Cost.** Today's message file holds 435 strings, about 14,400 characters. Each provider's
   current price per million characters, times the characters generated per release (all lines,
   every voice), gives the yearly cost; the count-along and units are cached once.
5. **Size.** The total size of the cached audio, which the offline app must carry (rule 5).
6. **Decide** in a decision record: the provider for English now, the route to Twi, Ga and Ewe,
   and whether the online AI voice tutor uses the same provider.

## Privacy

Build-time generation sends only our own scripted text, never anything a student writes
(AGENTS.md rule 4). The online AI voice tutor would send a student's questions to a provider; that
is a separate decision under ADR 0008 (AI from the API) and stays off for signed-out users and
classes by default.

## What Mortey needs to decide

- Which providers to try, and approval to create accounts with them (and any spend).
- Whether to recruit the listening panel, and through which school.

# Voice provider spike

Generates the coach's thirty test lines with each voice provider you have a key for, and writes a
blind listening page and a ratings sheet. The plan, method and candidates are in
[`docs/planning/voice-provider-spike.md`](../../docs/planning/voice-provider-spike.md).

1. Put your keys in `scripts/voice-spike/.env` (git-ignored; `.env.example` lists them). Leave
   out any provider you are not trying.
2. Run it:

   ```powershell
   bun scripts/voice-spike/run.ts
   ```

3. Open `scripts/voice-spike/out/listening.html` and give `out/ratings.csv` to the listening
   panel. Keep `out/key.json`, which says which voice is which, away from them until the ratings
   are in.

Only our own scripted text is sent to the providers. The Twi, Ewe and Ga lines are translated by
machine for the test and are judged by a native speaker; none of it goes into the app as it is.

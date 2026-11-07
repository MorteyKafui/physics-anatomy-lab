# Noto Sans

`NotoSans-Regular.ttf` and `NotoSans-Bold.ttf` are embedded in the lab report's PDF, so units such
as s⁻² and symbols such as π print as written and the text can be searched and read aloud.

- Source: github.com/notofonts/notofonts.github.io, `fonts/NotoSans/hinted/ttf/` (November 2026).
- Licence: SIL Open Font License 1.1, in `OFL.txt` beside them. © 2022 The Noto Project Authors.
- Noto Sans has no √; the report writes T² = 4π² l ⁄ g instead, and
  `apps/web/test/report-fonts.test.ts` checks every string the report prints has its glyphs.

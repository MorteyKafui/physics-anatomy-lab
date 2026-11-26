"use client";

import { RATES, VERBOSITY } from "@pa/audio";
import { coachIsOn, HELP_LEVELS, setSkillLevel, type HelpLevel } from "@pa/engine";
import { t, type MessageKey } from "@pa/i18n";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@pa/ui/components/popover";
import { Volume2Icon, VolumeXIcon } from "@pa/ui/icons";

import type { useAudio } from "./use-audio";
import type { AttemptHandle } from "./use-attempt";

/**
 * The lab header's settings, one copy for every practical: the help level, the help per skill,
 * and sound (the spoken coach, its captions, speed, voice and volumes). Every practical's lab
 * shows them, so a setting a student learns in one practical is there in the next.
 */

type Audio = ReturnType<typeof useAudio>;

/** The help level for the whole attempt. Hidden in an exam, where the coach is off. */
export function HelpLevelSelect({ handle }: { handle: AttemptHandle }) {
  const state = handle.state;
  if (state.mode === "exam") return null;
  return (
    <label className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
      {/* On narrower screens the words give way so the header stays on one row; the select keeps
          its name. */}
      <span className="sr-only min-[1320px]:not-sr-only">{t("lab.helpLevel.label")}</span>
      <select
        className="h-9 border border-input bg-surface px-2.5 text-sm font-medium text-foreground"
        value={state.helpLevel}
        onChange={(e) =>
          void handle.dispatch({ type: "set-help-level", level: e.target.value as HelpLevel })
        }
      >
        {HELP_LEVELS.map((level) => (
          <option key={level} value={level}>
            {t(`lab.helpLevel.${level}` as MessageKey)}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Sound: the spoken coach with captions, its speed and voice, and a volume per layer. */
export function SoundMenu({
  audio,
  countAlong = false,
}: {
  audio: Pick<Audio, "settings" | "update" | "canSpeak" | "voices">;
  /** Whether this practical counts aloud (the pendulum's swings). */
  countAlong?: boolean;
}) {
  const { settings, update, canSpeak, voices } = audio;
  const volumes = [
    ["voiceVolume", "lab.audio.voiceVolume"],
    ...(countAlong ? ([["countVolume", "lab.audio.countVolume"]] as const) : []),
    ["soundsVolume", "lab.audio.soundsVolume"],
  ] as const;
  return (
    <Popover>
      <PopoverTrigger
        aria-label={t("lab.audio.label")}
        className="ml-auto flex h-9 items-center gap-1.5 border border-input bg-surface px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring md:ml-0"
      >
        {settings.on ? (
          <Volume2Icon className="size-4" aria-hidden />
        ) : (
          <VolumeXIcon className="size-4" aria-hidden />
        )}
        {/* The word gives way below 1320 px, as the help level's does; the button keeps its name. */}
        <span className="hidden min-[1320px]:inline">{t("lab.audio.label")}</span>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverTitle>{t("lab.audio.title")}</PopoverTitle>
        <PopoverDescription>
          {canSpeak ? t("lab.audio.hint") : t("lab.audio.noSpeech")}
        </PopoverDescription>
        <div className="flex flex-col gap-3 text-sm">
          <label className="flex items-center gap-2 font-medium">
            <input
              type="checkbox"
              className="size-4 accent-primary"
              checked={settings.on}
              onChange={(e) => update({ on: e.target.checked })}
            />
            {t("lab.audio.on")}
          </label>
          <label className="flex items-center justify-between gap-3">
            {t("lab.audio.verbosity")}
            <select
              className="h-9 border border-input bg-background px-2 text-sm text-foreground"
              value={settings.verbosity}
              onChange={(e) => update({ verbosity: e.target.value as (typeof VERBOSITY)[number] })}
            >
              {VERBOSITY.map((v) => (
                <option key={v} value={v}>
                  {t(`lab.audio.verbosity.${v}` as MessageKey)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center justify-between gap-3">
            {t("lab.audio.rate")}
            <select
              className="h-9 border border-input bg-background px-2 font-mono text-sm text-foreground"
              value={settings.rate}
              onChange={(e) => update({ rate: Number(e.target.value) as (typeof RATES)[number] })}
            >
              {RATES.map((r) => (
                <option key={r} value={r}>
                  {r}×
                </option>
              ))}
            </select>
          </label>
          {voices.length > 0 && (
            <label className="flex items-center justify-between gap-3">
              {t("lab.audio.voice")}
              <select
                className="h-9 max-w-40 border border-input bg-background px-2 text-sm text-foreground"
                value={settings.voice ?? ""}
                onChange={(e) => update({ voice: e.target.value || undefined })}
              >
                <option value="">{t("lab.audio.voiceAuto")}</option>
                {voices.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          {volumes.map(([key, label]) => (
            <label key={key} className="flex items-center justify-between gap-3">
              {t(label)}
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                className="w-32 accent-primary"
                value={settings[key]}
                onChange={(e) => update({ [key]: Number(e.target.value) })}
              />
            </label>
          ))}
          {countAlong && (
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={settings.countAlong}
                onChange={(e) => update({ countAlong: e.target.checked })}
              />
              {t("lab.audio.countAlong")}
            </label>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Help per skill: a different help level for building, measuring, the table, the graph or the analysis. */
export function AssistMenu({ handle }: { handle: AttemptHandle }) {
  const state = handle.state;
  if (!coachIsOn(state)) return null;
  return (
    <Popover>
      <PopoverTrigger className="hidden h-9 items-center border border-input bg-surface px-3 text-sm font-medium focus-visible:outline-2 focus-visible:outline-ring md:flex">
        {t("lab.assist.perSkill")}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverTitle>{t("lab.assist.title")}</PopoverTitle>
        <PopoverDescription>{t("lab.assist.hint")}</PopoverDescription>
        <div className="flex flex-col gap-2">
          {(["apparatus", "measurement", "tabulation", "graph", "analysis"] as const).map(
            (skill) => (
              <label key={skill} className="flex items-center justify-between gap-3 text-sm">
                {t(`lab.assist.skill.${skill}` as MessageKey)}
                <select
                  className="h-9 border border-input bg-background px-2 text-sm text-foreground"
                  value={state.skillLevels[skill] ?? ""}
                  onChange={(e) => {
                    const level = (e.target.value || undefined) as HelpLevel | undefined;
                    const ev = setSkillLevel(handle.state, skill, level);
                    if (ev) void handle.record([ev]);
                  }}
                >
                  <option value="">
                    {t("lab.assist.same", {
                      level: t(`lab.helpLevel.${state.helpLevel}` as MessageKey),
                    })}
                  </option>
                  {HELP_LEVELS.map((level) => (
                    <option key={level} value={level}>
                      {t(`lab.helpLevel.${level}` as MessageKey)}
                    </option>
                  ))}
                </select>
              </label>
            ),
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

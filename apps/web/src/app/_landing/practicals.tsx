"use client";

import { t, type MessageKey } from "@pa/i18n";
import "@pa/i18n/landing";
import type { Topic } from "@pa/ui";
import { createContext, useContext, useState, type ReactNode } from "react";

/** The six practicals the landing page shows, in the hero's tab order (Landing.dc.html). */
export const PRACTICALS = [
  { id: "pendulum", topic: "mechanics", href: "/lab/simple-pendulum" },
  { id: "circuit", topic: "electricity", href: "/lab/ohms-law" },
  { id: "lens", topic: "light", href: "/lab/converging-lens" },
  { id: "pins", topic: "light", href: "/lab/converging-lens-pins" },
  { id: "mixtures", topic: "heat", href: "/lab/method-of-mixtures" },
  { id: "solid", topic: "heat", href: "/lab/method-of-mixtures-solid" },
] as const satisfies readonly { id: string; topic: Topic; href: string }[];

export type PracticalId = (typeof PRACTICALS)[number]["id"];
export type Practical = (typeof PRACTICALS)[number];

export const practicalTitle = (id: PracticalId) => t(`landing.cards.${id}.title` as MessageKey);
export const practicalShort = (id: PracticalId) => t(`landing.bench.${id}.short` as MessageKey);

interface Chosen {
  index: number;
  practical: Practical;
  choose: (index: number) => void;
}

const ChosenPractical = createContext<Chosen | null>(null);

/**
 * The practical the hero's bench shows. The hero's main button and the share link in the orange
 * band follow it, so a teacher who picks the lens in the hero copies the lens's link.
 */
export function PracticalProvider({ children }: { children: ReactNode }) {
  const [index, setIndex] = useState(0);
  return (
    <ChosenPractical.Provider value={{ index, practical: PRACTICALS[index]!, choose: setIndex }}>
      {children}
    </ChosenPractical.Provider>
  );
}

export function useChosenPractical(): Chosen {
  const chosen = useContext(ChosenPractical);
  if (!chosen) throw new Error("useChosenPractical needs a PracticalProvider");
  return chosen;
}

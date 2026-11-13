import { simplePendulum } from "@pa/experiments";
import { t } from "@pa/i18n";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PendulumCheckScreen } from "../../check/pendulum";

const BUILT = [simplePendulum.id] as const;

export function generateStaticParams() {
  return BUILT.map((experiment) => ({ experiment }));
}

export const dynamicParams = false;

export const metadata: Metadata = {
  title: `${t("experiments.simple-pendulum.check.title")} · ${t("experiments.simple-pendulum.title")} · Physics Anatomy`,
};

/** The model check (data templates brief, decision 8): it works signed out, and uses no AI. */
export default async function CheckPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (!(BUILT as readonly string[]).includes(experiment)) notFound();
  return <PendulumCheckScreen />;
}

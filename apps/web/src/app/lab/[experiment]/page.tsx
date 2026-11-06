import { simplePendulum } from "@pa/experiments";
import { t } from "@pa/i18n";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { LabScreen } from "../lab-screen";

/** The four v1 experiments get a lab each; the simple pendulum is built first. */
const BUILT = [simplePendulum.id] as const;

export function generateStaticParams() {
  return BUILT.map((experiment) => ({ experiment }));
}

export const dynamicParams = false;

export const metadata: Metadata = {
  title: `${t("experiments.simple-pendulum.title")} · Physics Anatomy`,
};

export default async function LabPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (!(BUILT as readonly string[]).includes(experiment)) notFound();
  return <LabScreen />;
}

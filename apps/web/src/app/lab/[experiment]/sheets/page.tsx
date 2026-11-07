import { simplePendulum } from "@pa/experiments";
import { t } from "@pa/i18n";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SheetsScreen } from "../../sheets/screen";

const BUILT = [simplePendulum.id] as const;

export function generateStaticParams() {
  return BUILT.map((experiment) => ({ experiment }));
}

export const dynamicParams = false;

export const metadata: Metadata = {
  title: `${t("sheets.title")} · ${t("experiments.simple-pendulum.title")} · Physics Anatomy`,
};

export default async function SheetsPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (!(BUILT as readonly string[]).includes(experiment)) notFound();
  return <SheetsScreen />;
}

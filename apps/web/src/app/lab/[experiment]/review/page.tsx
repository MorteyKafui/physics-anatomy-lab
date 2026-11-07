import { simplePendulum } from "@pa/experiments";
import { t } from "@pa/i18n";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReviewScreen } from "../../review-screen";

const BUILT = [simplePendulum.id] as const;

export function generateStaticParams() {
  return BUILT.map((experiment) => ({ experiment }));
}

export const dynamicParams = false;

export const metadata: Metadata = {
  title: `${t("review.title")} · ${t("experiments.simple-pendulum.title")} · Physics Anatomy`,
};

export default async function ReviewPage({ params }: { params: Promise<{ experiment: string }> }) {
  const { experiment } = await params;
  if (!(BUILT as readonly string[]).includes(experiment)) notFound();
  return <ReviewScreen />;
}

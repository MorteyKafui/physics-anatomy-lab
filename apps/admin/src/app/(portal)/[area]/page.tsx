// The portal's later areas (master plan, admin portal table). Each says plainly that it is not
// built yet and what will fill it, rather than showing invented numbers (D29).
import { notFound } from "next/navigation";

import { Empty } from "@/components/bits";
import { TopBar } from "@/components/topbar";
import { staffMe } from "@/lib/api";

const LATER: Readonly<Record<string, { title: string; body: string }>> = {
  "question-bank": {
    title: "Question bank",
    body: "AI-drafted questions waiting for review, to approve, edit or reject. Not built yet: no questions are drafted.",
  },
  ai: {
    title: "AI",
    body: "Requests, cost per feature, cache hit rate, evaluation results, flagged replies and the off switch. Not built yet: the API makes no AI calls, so there is nothing to count.",
  },
  research: {
    title: "Research",
    body: "Consent records, pilot cohorts and approved anonymised exports for the UEW study. Not built yet.",
  },
  translation: {
    title: "Translation",
    body: "Progress per language, missing strings and audio lines still to generate. Not built yet: the lab is in English (en-GB) only.",
  },
};

export default async function LaterArea({ params }: { params: Promise<{ area: string }> }) {
  const later = LATER[(await params).area];
  if (!later) notFound();
  const me = await staffMe();
  return (
    <>
      <TopBar page={later.title} environment={me.ok ? me.data.environment : null} />
      <div className="ad-body">
        <Empty title="Not built yet">{later.body}</Empty>
      </div>
    </>
  );
}

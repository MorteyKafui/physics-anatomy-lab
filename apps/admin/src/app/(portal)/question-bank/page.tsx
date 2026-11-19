// The Question bank (ai-questions-brief.md): questions teachers sent for review, by state.
import type { QuestionReview } from "@pa/api-client";
import Link from "next/link";

import { ApiProblem, Panel } from "@/components/bits";
import { QuestionBank } from "@/components/questions";
import { TopBar } from "@/components/topbar";
import { adminGet, staffMe } from "@/lib/api";

const STATES = [
  { id: "submitted", label: "Waiting" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Not approved" },
] as const;

export default async function QuestionBankPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const asked = (await searchParams).state;
  const state = STATES.find((s) => s.id === asked)?.id ?? "submitted";
  const [me, r] = await Promise.all([
    staffMe(),
    adminGet<QuestionReview[]>(`/admin/questions?state=${state}`),
  ]);
  const top = (
    <TopBar page="Question bank" environment={me.ok ? me.data.environment : null}>
      <div role="group" aria-label="State" className="ad-seg">
        {STATES.map((s) => (
          <Link
            key={s.id}
            className="ad-f"
            href={`/question-bank?state=${s.id}`}
            aria-current={s.id === state ? "true" : undefined}
            scroll={false}
          >
            {s.label}
          </Link>
        ))}
      </div>
    </TopBar>
  );
  if (!r.ok)
    return (
      <>
        {top}
        <ApiProblem status={r.status} detail={r.detail} />
      </>
    );
  const waiting = state === "submitted" ? r.data.length : undefined;
  return (
    <>
      {top}
      <div className="ad-body">
        <Panel
          title={
            waiting === undefined ? "Question bank" : `Question bank: ${String(waiting)} to review`
          }
        >
          <QuestionBank questions={r.data} />
        </Panel>
      </div>
    </>
  );
}

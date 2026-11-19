"use server";

// Every change the portal makes is one admin API call, which checks the staff member's Access
// token and writes the audit entry in the same transaction (ADR 0040).
import type { AiSwitchState, ClassRow, MemberRow, QuestionReview } from "@pa/api-client";
import { revalidatePath } from "next/cache";

import { adminGet, adminPost } from "@/lib/api";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; detail: string };

function done<T>(r: Awaited<ReturnType<typeof adminPost<T>>>): ActionResult<T> {
  return r.ok ? { ok: true, data: r.data } : { ok: false, detail: r.detail };
}

export async function setClassAi(
  classId: string,
  enabled: boolean,
  reason?: string,
): Promise<ActionResult<ClassRow>> {
  const r = await adminPost<ClassRow>(`/admin/classes/${encodeURIComponent(classId)}/ai`, {
    enabled,
    reason: reason ?? null,
  });
  revalidatePath("/", "layout");
  return done(r);
}

export async function setAiSwitch(
  name: AiSwitchState["name"],
  enabled: boolean,
  reason?: string,
): Promise<ActionResult<AiSwitchState[]>> {
  const r = await adminPost<AiSwitchState[]>(`/admin/ai/switches/${encodeURIComponent(name)}`, {
    enabled,
    reason: reason ?? null,
  });
  revalidatePath("/ai");
  return done(r);
}

export async function replaceDisplayName(
  memberId: string,
  displayName: string,
  reason: string,
): Promise<ActionResult<MemberRow>> {
  const r = await adminPost<MemberRow>(
    `/admin/members/${encodeURIComponent(memberId)}/display-name`,
    { display_name: displayName, reason },
  );
  revalidatePath("/", "layout");
  return done(r);
}

export async function exportCsv(
  report: "mistakes" | "stages" | "classes",
  range: "24h" | "7d" | "30d",
  experimentId?: string,
): Promise<ActionResult<string>> {
  const r = await adminPost<string>("/admin/exports", {
    report,
    range,
    experiment_id: experimentId ?? null,
  });
  return done(r);
}

export async function membersOf(classId: string): Promise<ActionResult<MemberRow[]>> {
  const r = await adminGet<MemberRow[]>(
    `/admin/people/classes/${encodeURIComponent(classId)}/members`,
  );
  return r.ok ? { ok: true, data: r.data } : { ok: false, detail: r.detail };
}

export async function classesForSearch(): Promise<ActionResult<ClassRow[]>> {
  const r = await adminGet<ClassRow[]>("/admin/people/classes");
  return r.ok ? { ok: true, data: r.data } : { ok: false, detail: r.detail };
}

// The question bank (docs/content/ai-questions-brief.md): each decision is one admin call, in
// the audit log.
export async function approveQuestion(
  id: string,
  edits?: { question: string; answer: string; marks: number },
): Promise<ActionResult<QuestionReview>> {
  const r = await adminPost<QuestionReview>(
    `/admin/questions/${encodeURIComponent(id)}/approve`,
    edits ?? {},
  );
  revalidatePath("/question-bank");
  return done(r);
}

export async function rejectQuestion(
  id: string,
  reason: string,
): Promise<ActionResult<QuestionReview>> {
  const r = await adminPost<QuestionReview>(`/admin/questions/${encodeURIComponent(id)}/reject`, {
    reason,
  });
  revalidatePath("/question-bank");
  return done(r);
}

export async function reopenQuestion(id: string): Promise<ActionResult<QuestionReview>> {
  const r = await adminPost<QuestionReview>(
    `/admin/questions/${encodeURIComponent(id)}/reopen`,
    {},
  );
  revalidatePath("/question-bank");
  return done(r);
}

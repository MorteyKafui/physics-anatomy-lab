import type { Overview } from "@pa/api-client";
import type { ReactNode } from "react";

import { Shell } from "@/components/shell";
import { ToastProvider } from "@/components/toast";
import { adminGet, staffMe } from "@/lib/api";
import { EXPERIMENTS } from "@/lib/experiments";
import { initials } from "@/lib/format";

// Every page reads live numbers through the admin API; nothing is prerendered.
export const dynamic = "force-dynamic";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const [me, month] = await Promise.all([
    staffMe(),
    adminGet<Overview>("/admin/overview?range=30d"),
  ]);
  const used = month.ok ? month.data.experiments : [];
  const completion = EXPERIMENTS.filter((e) => e.flagship).map((e) => {
    const rows = used.filter((u) => u.experiment_id === e.id);
    return {
      id: e.id,
      title: e.title,
      colour: `var(--pa-topic-${e.topic})`,
      attempts: rows.reduce((s, r) => s + r.attempts, 0),
      reports: rows.reduce((s, r) => s + r.reports, 0),
    };
  });
  return (
    <ToastProvider>
      <Shell
        staff={me.ok ? { ...me.data, initials: initials(me.data.email) } : null}
        completion={completion}
        badges={{ "/people": month.ok ? month.data.flagged_names.length : 0 }}
        experiments={EXPERIMENTS.map((e) => ({ id: e.id, title: e.title }))}
      >
        {children}
      </Shell>
    </ToastProvider>
  );
}

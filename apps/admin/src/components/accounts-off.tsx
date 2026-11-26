// While accounts are switched off (ADR 0047), the pages about people and AI say so in one line,
// so an empty table is not read as a fault.
import { accountsEnabled } from "@/lib/accounts";

import { Panel } from "./bits";

export function AccountsOff({ about }: { about: string }) {
  if (accountsEnabled()) return null;
  return (
    <Panel label="Accounts are switched off" title="Accounts are switched off" sub={about}>
      {null}
    </Panel>
  );
}

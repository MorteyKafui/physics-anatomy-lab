"use client";

import { createContext, useContext, type ReactNode } from "react";

const AccountsContext = createContext(false);

/** Hands the server's accounts switch (./accounts.ts) to client components. */
export function AccountsSwitch({ on, children }: { on: boolean; children: ReactNode }) {
  return <AccountsContext value={on}>{children}</AccountsContext>;
}

/** Whether accounts, and with them AI help, are switched on (ADR 0047). Off by default. */
export const useAccountsEnabled = () => useContext(AccountsContext);

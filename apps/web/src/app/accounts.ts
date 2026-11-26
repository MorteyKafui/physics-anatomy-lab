/**
 * The accounts switch (ADR 0047): `ACCOUNTS_ENABLED`, off unless it is "true", in every
 * environment. The API and the admin portal read the same setting.
 *
 * Off, the site shows no sign-in, sign-up, join, account, teacher or AI-help link, and the
 * account pages send their visitors home (src/proxy.ts). Read on the server, on each request,
 * so one build serves either way; client components ask `useAccountsEnabled`.
 */
export function accountsEnabled(): boolean {
  return process.env.ACCOUNTS_ENABLED === "true";
}

/** The pages that exist only for accounts: off, each redirects to `/` with a 307. */
export const ACCOUNT_PAGES = /^\/(sign-in|join|account|teach)(\/|$)/;

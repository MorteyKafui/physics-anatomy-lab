/**
 * The accounts switch (ADR 0047): `ACCOUNTS_ENABLED`, off unless it is "true", in every
 * environment. The same setting as the web app's and the API's. Read on the server, on each
 * request.
 */
export function accountsEnabled(): boolean {
  return process.env.ACCOUNTS_ENABLED === "true";
}

/**
 * Which requests the service worker may keep. Pure, so `test/sw-rules.test.ts` can check it.
 *
 * The API's answers are never kept: they are about a signed-in person (who is signed in, their
 * classes, their export, their synced work), they go stale, and on a shared school computer the
 * next person could be served them. The lab works offline from IndexedDB, not from these.
 */
export const API_PREFIX = "/api/";

/** A request to this app's API, which the service worker leaves to the network. */
export function isApi(url: URL, origin: string): boolean {
  return url.origin === origin && url.pathname.startsWith(API_PREFIX);
}

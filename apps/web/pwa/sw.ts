/// <reference lib="webworker" />
import { CacheFirst, NetworkFirst, Serwist, type PrecacheEntry } from "serwist";

declare const self: ServiceWorkerGlobalScope & { __SW_MANIFEST: (PrecacheEntry | string)[] };

/**
 * The offline service worker (master plan, "Offline": an installable PWA; AGENTS.md rule 5).
 * At install it precaches the app: Next's static assets, every prerendered page (the lab, the
 * notebook, the review, the report, the print sheets, the exam) and the report's fonts, so after
 * one visit everything works with no connection. The lab never waits on the network: attempts
 * live in IndexedDB, and the server only syncs.
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      // The client router's page payloads (?_rsc=…) always come from the network. Offline the
      // fetch fails, the router loads the page itself, and that comes from the precache below.
      matcher: ({ request, url }) => request.headers.has("RSC") || url.searchParams.has("_rsc"),
      handler: new NetworkFirst({ cacheName: "pages-rsc", networkTimeoutSeconds: 4 }),
    },
    {
      // A page not in the precache: the network when there is one, the last copy when not.
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkFirst({ cacheName: "pages", networkTimeoutSeconds: 4 }),
    },
    {
      // Anything else of ours: from the cache once fetched (it is versioned by its name).
      matcher: ({ request, sameOrigin }) => sameOrigin && request.method === "GET",
      handler: new CacheFirst({ cacheName: "assets" }),
    },
  ],
});

serwist.addEventListeners();

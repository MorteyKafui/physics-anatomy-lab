"use client";

import { t } from "@pa/i18n";
import { useEffect, useSyncExternalStore } from "react";

const subscribe = (onChange: () => void) => {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
};

/**
 * The offline app (AGENTS.md rule 5): registers the service worker that keeps the lab on this
 * device, and says so quietly when there is no connection. Nothing else changes offline.
 */
export function Offline() {
  const online = useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // No service worker (a private window, say): the app still works while it is open.
    });
  }, []);
  return (
    <p role="status" className="pointer-events-none fixed bottom-4 left-4 z-50 m-0 empty:hidden">
      {online ? (
        ""
      ) : (
        <span className="block bg-foreground px-3 py-2 text-[13px] text-background">
          {t("app.offline")}
        </span>
      )}
    </p>
  );
}

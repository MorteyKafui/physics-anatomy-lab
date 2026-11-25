"use client";

import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile, which the API asks for on sign-in and join (ADR 0038). It loads only on
 * these screens and only when the build has a site key; without one (local runs, CI) the API's
 * check is off too, so the form sends no token.
 */
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
}

export const turnstileOn = Boolean(SITE_KEY);

export function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!SITE_KEY || !el) return;
    let id: string | undefined;
    const draw = () => {
      const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      if (!api) return;
      id = api.render(el, {
        sitekey: SITE_KEY,
        callback: (token: string) => onToken(token),
        "expired-callback": () => onToken(null),
        "error-callback": () => onToken(null),
      });
    };
    if ((window as unknown as { turnstile?: TurnstileApi }).turnstile) draw();
    else {
      const s = document.createElement("script");
      s.src = SCRIPT;
      s.async = true;
      s.addEventListener("load", draw);
      document.head.appendChild(s);
    }
    return () => {
      const api = (window as unknown as { turnstile?: TurnstileApi }).turnstile;
      if (id && api) api.remove(id);
    };
  }, [onToken]);
  return SITE_KEY ? <div ref={box} className="min-h-[65px]" /> : null;
}

"use client";

import { createApi, tokenFromFragment } from "@pa/api-client";
import { t } from "@pa/i18n";
import "@pa/i18n/access";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { LEDE } from "../../_access/screen";
import { SignIn } from "../sign-in";

const api = createApi();

/**
 * Posts the link's token once (a GET never signs in), then asks a new teacher what students
 * should call them, or goes on to their classes. A used or late link shows the board's
 * "This link has expired" with a way to ask for a new one.
 */
export function VerifyLink() {
  const router = useRouter();
  const [state, setState] = useState<"checking" | "expired" | "name">("checking");

  useEffect(() => {
    const token = tokenFromFragment(window.location.hash);
    // Take the token out of the address bar and history as soon as it is read.
    window.history.replaceState(null, "", window.location.pathname);
    const verified = token
      ? api.auth.verifyEmailLink(token)
      : Promise.resolve({ ok: false } as const);
    void verified.then((r) => {
      if (!r.ok) return setState("expired");
      if (r.data.display_name) router.replace("/teach");
      else setState("name");
    });
  }, [router]);

  if (state === "checking") return <p className={LEDE}>{t("access.link.checking")}</p>;
  return <SignIn expired={state === "expired"} askName={state === "name"} />;
}

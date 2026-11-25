import type { Metadata } from "next";

import { AccessScreen } from "../../_access/screen";
import { VerifyLink } from "./verify";

export const metadata: Metadata = { title: "Signing in · Physics Anatomy" };

/** Where the email link lands: /sign-in/link#token=…, the token in the fragment, never sent to a server log. */
export default function LinkPage() {
  return (
    <AccessScreen>
      <VerifyLink />
    </AccessScreen>
  );
}

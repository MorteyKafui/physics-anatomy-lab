import type { Metadata } from "next";

import { AccessScreen } from "../_access/screen";
import { SignIn } from "./sign-in";

export const metadata: Metadata = { title: "Sign in to teach · Physics Anatomy" };

/** Teacher sign-in (design/mockups/SignIn.dc.html; landing page brief, decision 6). */
export default function SignInPage() {
  return (
    <AccessScreen>
      <SignIn />
    </AccessScreen>
  );
}

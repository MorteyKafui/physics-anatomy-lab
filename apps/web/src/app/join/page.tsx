import type { Metadata } from "next";

import { AccessScreen } from "../_access/screen";
import { Join } from "./join";

export const metadata: Metadata = { title: "Join your class · Physics Anatomy" };

/** Joining a class with a code (design/mockups/Join.dc.html; landing page brief, decision 6). */
export default function JoinPage() {
  return (
    <AccessScreen>
      <Join />
    </AccessScreen>
  );
}

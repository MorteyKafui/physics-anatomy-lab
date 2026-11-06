import type { Metadata } from "next";

import { Catalogue } from "./catalogue";

export const metadata: Metadata = {
  title: "Design system · Physics Anatomy admin",
  description: "Tokens, themes, type and every component in packages/ui.",
  robots: { index: false, follow: false },
};

export default function DesignSystemPage() {
  return <Catalogue />;
}

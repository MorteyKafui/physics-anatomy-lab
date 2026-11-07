import { markImage } from "../../mark";

/** The install icons the manifest lists: 192 and 512 px, and a maskable 512 px. */
const SIZES = { "192": [192, 0.16], "512": [512, 0.16], "maskable-512": [512, 0.26] } as const;

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(SIZES).map((size) => ({ size }));
}

export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const [px, inset] = SIZES[(await params).size as keyof typeof SIZES];
  return markImage(px, inset);
}

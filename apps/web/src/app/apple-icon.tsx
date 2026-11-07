import { markImage } from "./mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** The home-screen icon on an iPhone or iPad. */
export default function AppleIcon() {
  return markImage(180, 0.16);
}

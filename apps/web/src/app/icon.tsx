import { markImage } from "./mark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** The browser tab's icon. */
export default function Icon() {
  return markImage(32, 0.08);
}

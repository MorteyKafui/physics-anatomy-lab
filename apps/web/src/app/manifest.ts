import { colour } from "@pa/ui";
import type { MetadataRoute } from "next";

/** The web app manifest: Physics Anatomy installs like an app and opens on the lab. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Physics Anatomy",
    short_name: "Physics Anatomy",
    description:
      "Physics from first principles. Build real experiments, take your own readings, and get coached.",
    lang: "en-GB",
    start_url: "/lab/simple-pendulum",
    scope: "/",
    display: "standalone",
    background_color: colour.ink950,
    theme_color: colour.ink950,
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

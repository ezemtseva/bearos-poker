import type { MetadataRoute } from "next"

// Web app manifest — lets the site be installed as an app (Home Screen / PWA)
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bearos Poker",
    short_name: "Bearos Poker",
    description: "An online card game with custom rules",
    start_url: "/",
    display: "standalone",
    background_color: "#0B0C0F",
    theme_color: "#0B0C0F",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  }
}

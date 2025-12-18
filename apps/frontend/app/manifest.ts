import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://drop-date.com";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DropDate — дізнайся дату наступного релізу",
    short_name: "DropDate",
    description:
      "DropDate підказує дату наступного релізу серіалів і фільмів. Пошук по TMDB, постери та збережений список.",
    start_url: siteUrl,
    scope: siteUrl,
    display: "standalone",
    background_color: "#0b1f1a",
    theme_color: "#0b1f1a",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      },
      {
        src: "/apple-touch-icon.svg",
        sizes: "any",
        type: "image/svg+xml"
      }
    ]
  };
}

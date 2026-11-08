import type { Metadata, Viewport } from "next";
import { Manrope, Rubik } from "next/font/google";
import "./globals.css";
import { Footer } from "../src/widgets/Footer";
import { Providers } from "./providers";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-body",
});
const rubik = Rubik({
  subsets: ["latin", "cyrillic"],
  variable: "--font-display",
});
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://drop-date.com";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1f1a",
  colorScheme: "dark"
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DropDate — дізнайся дату наступного релізу серіалів і фільмів",
    template: "%s — DropDate"
  },
  description:
    "DropDate підказує дату наступного релізу серіалу чи фільму. Пошук через TMDB, швидкі підказки, грід постерів і список збережених.",
  applicationName: "DropDate",
  category: "entertainment",
  keywords: [
    "DropDate",
    "дата релізу",
    "серіали",
    "фільми",
    "наступний реліз",
    "TMDB",
    "коли вийде серія"
  ],
  alternates: {
    canonical: "/"
  },
  manifest: "/manifest.webmanifest",
  // The bare mark has a transparent ground, so it cannot serve as a favicon on
  // light browser chrome. Tabs and home screens get the tile; app/icon.png is
  // picked up by Next's file convention for the raster fallback.
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png", sizes: "512x512" }
    ],
    shortcut: "/icon.svg",
    apple: "/apple-touch-icon.svg"
  },
  openGraph: {
    type: "website",
    locale: "uk_UA",
    url: "/",
    siteName: "DropDate",
    title: "DropDate — дізнайся дату наступного релізу серіалів і фільмів",
    description:
      "Пошук по TMDB, швидкі підказки, грід постерів і список збережених. Дізнавайся, коли вийде нова серія."
  },
  twitter: {
    card: "summary_large_image",
    title: "DropDate — дізнайся дату наступного релізу серіалів і фільмів",
    description:
      "Пошук по TMDB, швидкі підказки, грід постерів і список збережених. Дізнавайся, коли вийде нова серія."
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uk">
      <body className={`${manrope.variable} ${rubik.variable}`}>
        <Providers>{children}</Providers>
        <Footer />
      </body>
    </html>
  );
}

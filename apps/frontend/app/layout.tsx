import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Footer } from "../src/widgets/Footer";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin", "cyrillic"] });
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
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png"
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
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <Footer />
      </body>
    </html>
  );
}

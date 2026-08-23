"use client";

import Image from "next/image";
import Link from "next/link";
import { copy } from "../shared/lib/strings";
import { Icon, type IconName } from "../shared/ui/Icon";

type LinkColumn = {
  title: string;
  links: { href: string; label: string }[];
};

// Only routes that exist are linked: a footer full of dead ends is worse than a
// short one. The design's "API" / "Політика приватності" / "Умови" entries have
// no pages yet and are therefore absent rather than pointing at 404s.
const COLUMNS: LinkColumn[] = [
  {
    title: "Продукт",
    links: [
      { href: "/calendar", label: "Календар релізів" },
      { href: "/mood", label: "Підбір за настроєм" },
      { href: "/games/battle", label: "Кіно-баттл" },
      { href: "/saved", label: "Мій список" },
    ],
  },
  {
    title: "Каталог",
    links: [
      { href: "/search?query=", label: "Пошук" },
      { href: "/match", label: "Кінопідбірник" },
      { href: "/games", label: "Ігрова зала" },
      { href: "/bridge", label: "Культурний міст" },
    ],
  },
  {
    title: "Про нас",
    links: [
      { href: "/changelog", label: "Що нового" },
      { href: "/friends", label: "Друзі" },
      { href: "/profile", label: "Профіль" },
    ],
  },
];

const SOCIALS: { href: string; label: string; icon: IconName }[] = [
  { href: "https://t.me/", label: "Telegram", icon: "send" },
  { href: "https://instagram.com/", label: "Instagram", icon: "instagram" },
  { href: "https://youtube.com/", label: "YouTube", icon: "youtube" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-top">
          <div className="footer-brand">
            <div className="footer-brand__mark">
              <span className="brand-mark">
                <Image
                  src="/logo.png"
                  alt=""
                  className="brand-logo"
                  width={56}
                  height={56}
                  aria-hidden="true"
                />
              </span>
              <strong>{copy.appName}</strong>
            </div>
            <p className="footer-brand__tagline">
              Дата наступного релізу в один клік. Без спойлерів і зайвого шуму.
            </p>
            <div className="footer-actions">
              <span className="store-badge">
                <Image
                  src="/app-store-badge.svg"
                  alt={copy.footer.appStoreAlt}
                  width={140}
                  height={42}
                />
              </span>
              <span className="store-badge">
                <Image
                  src="/play-market-badge.svg"
                  alt={copy.footer.playStoreAlt}
                  width={146}
                  height={42}
                />
              </span>
            </div>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.title} className="footer-column" aria-label={column.title}>
              <strong className="footer-column__title">{column.title}</strong>
              {column.links.map((link) => (
                <Link key={link.href} href={link.href} className="footer-column__link">
                  {link.label}
                </Link>
              ))}
            </nav>
          ))}
        </div>

        <div className="footer-bottom">
          <span className="footer-year">
            © {year} {copy.appName} · Release radar for film and TV drops
          </span>
          <div className="footer-socials">
            {SOCIALS.map((social) => (
              <a
                key={social.label}
                href={social.href}
                className="footer-social"
                aria-label={social.label}
                target="_blank"
                rel="noreferrer noopener"
              >
                <Icon name={social.icon} size={15} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

"use client";

import Image from "next/image";
import { copy } from "../shared/lib/strings";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-brand">
          <strong>{copy.appName}</strong>
          <span>{copy.tagline}</span>
        </div>
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
        <div className="footer-year">© {year} Release radar for film and TV drops</div>
      </div>
    </footer>
  );
}

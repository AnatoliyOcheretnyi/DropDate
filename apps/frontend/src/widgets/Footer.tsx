"use client";

import Image from "next/image";
import { copy } from "../shared/lib/strings";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-year">© {year}</div>
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
    </footer>
  );
}

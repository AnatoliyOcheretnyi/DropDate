"use client";

import Image from "next/image";

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
              alt="Download on the App Store"
              width={140}
              height={42}
            />
          </span>
          <span className="store-badge">
            <Image
              src="/play-market-badge.svg"
              alt="Get it on Google Play"
              width={146}
              height={42}
            />
          </span>
        </div>
      </div>
    </footer>
  );
}

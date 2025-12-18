"use client";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="footer-year">© {year}</div>
        <div className="footer-actions">
          <span className="store-badge">
            <img src="/app-store-badge.svg" alt="Download on the App Store" />
          </span>
          <span className="store-badge">
            <img src="/play-market-badge.svg" alt="Get it on Google Play" />
          </span>
        </div>
      </div>
    </footer>
  );
}

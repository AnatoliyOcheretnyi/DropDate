/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  images: {
    // Posters and profiles already arrive pre-resized from TMDB's CDN, so the
    // loader picks a TMDB width bucket instead of paying for a Vercel
    // transformation. See src/shared/lib/tmdbImageLoader.ts.
    loader: "custom",
    loaderFile: "./src/shared/lib/tmdbImageLoader.ts",
    // Kept so the built-in optimizer still works if the custom loader is removed.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
    ],
    // Narrowed to the widths the layout actually asks for, so srcset entries
    // line up with TMDB's buckets instead of fanning out across 16 candidates.
    imageSizes: [92, 154, 185, 342, 500],
    deviceSizes: [640, 828, 1080, 1920],
  },
  experimental: {
    externalDir: true
  },
  poweredByHeader: false,
  async headers() {
    const isProduction = process.env.NODE_ENV === "production";
    const contentSecurityPolicy = [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://image.tmdb.org",
      "font-src 'self' data:",
      `connect-src 'self' https:${isProduction ? "" : " ws:"}`,
      "media-src 'self' https:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      ...(isProduction ? ["upgrade-insecure-requests"] : []),
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

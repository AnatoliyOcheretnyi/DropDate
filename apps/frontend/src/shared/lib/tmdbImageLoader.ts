/**
 * Custom next/image loader.
 *
 * Every remote image in the app comes from image.tmdb.org, which is already a
 * CDN serving pre-resized JPEGs from a fixed set of width buckets. Routing those
 * through Vercel's image optimizer costs a billable transformation per unique
 * (source, width, quality) combination and buys us little beyond format
 * conversion, so we map the requested width onto TMDB's own bucket instead and
 * let the browser fetch it straight from TMDB.
 *
 * Local assets (logo, badges) are returned untouched — there are four of them
 * and they are already small.
 */

const TMDB_IMAGE_PREFIX = "https://image.tmdb.org/t/p/";

/**
 * Widths TMDB serves for poster/profile/backdrop paths alike. We deliberately
 * stop at w780 rather than `original`: backdrops at original run into megabytes.
 */
const TMDB_WIDTHS = [92, 154, 185, 342, 500, 780] as const;

function pickBucket(width: number): number {
  return TMDB_WIDTHS.find((bucket) => bucket >= width) ?? TMDB_WIDTHS[TMDB_WIDTHS.length - 1];
}

type LoaderArgs = {
  src: string;
  width: number;
  quality?: number;
};

export default function tmdbImageLoader({ src, width }: LoaderArgs): string {
  if (!src.startsWith(TMDB_IMAGE_PREFIX)) {
    return src;
  }

  const path = src.slice(TMDB_IMAGE_PREFIX.length);
  const separator = path.indexOf("/");
  if (separator === -1) {
    return src;
  }

  const filePath = path.slice(separator + 1);
  return `${TMDB_IMAGE_PREFIX}w${pickBucket(width)}/${filePath}`;
}

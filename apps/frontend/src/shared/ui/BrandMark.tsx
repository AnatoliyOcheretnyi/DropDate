"use client";

import { useId } from "react";

/**
 * The DropDate monogram, inline.
 *
 * It ships as markup rather than an <img>: the mark sits on the header's glass
 * chip, so it has to be genuinely transparent and stay crisp at any density —
 * a raster of it was neither. The back D is knocked out where the front D
 * crosses it, which is what keeps the two letters apart at small sizes and
 * when the mark collapses to a single colour.
 */

const BACK = "M51 62v132M51 62h26a66 66 0 0 1 0 132H51";
const FRONT = "M113 62v132M113 62h26a66 66 0 0 1 0 132h-26";

export function BrandMark({
  size = 44,
  className,
  title
}: {
  size?: number;
  className?: string;
  /** Pass only when the mark stands alone; beside the wordmark it is decorative. */
  title?: string;
}) {
  // The header and footer both render one, so the mask id has to be unique per
  // instance — and stable across server and client, which rules out a counter.
  const maskId = `${useId()}-cut`;

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      <defs>
        <mask
          id={maskId}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width="256"
          height="256"
        >
          <rect width="256" height="256" fill="#fff" />
          <path
            d={FRONT}
            fill="none"
            stroke="#000"
            strokeWidth={44}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </mask>
      </defs>
      <g
        fill="none"
        strokeWidth={22}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path
          d={BACK}
          stroke="var(--dd-accent-dim)"
          mask={`url(#${maskId})`}
        />
        <path d={FRONT} stroke="var(--dd-accent)" />
      </g>
    </svg>
  );
}

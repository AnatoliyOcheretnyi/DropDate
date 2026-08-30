/**
 * Where a hover card sits next to the thing that opened it.
 *
 * The rule is the same everywhere it is used: prefer the right side of the
 * anchor, flip to the left when there is no room, and never let the card leave
 * the viewport. Whatever height is left below the top edge becomes the card's
 * scroll box, so a long card scrolls rather than running off the screen.
 */
export type AnchorPlacement = {
  left: number;
  top: number;
  maxHeight: number;
  /** Which edge the card grew from, so it can animate out of the anchor. */
  originX: "left" | "right";
};

/** Distance between the anchor and the card. */
const GAP = 12;
/** Smallest gap kept between the card and the edge of the viewport. */
const EDGE = 10;

export function placeBeside(
  anchor: DOMRect,
  width: number,
  estimatedHeight: number,
  minHeight = 220
): AnchorPlacement {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let left = anchor.right + GAP;
  let originX: "left" | "right" = "left";
  if (left + width > viewportWidth - EDGE) {
    left = anchor.left - GAP - width;
    originX = "right";
  }
  left = Math.max(EDGE, Math.min(left, viewportWidth - width - EDGE));

  let top = anchor.top;
  if (top + estimatedHeight > viewportHeight - EDGE) {
    top = Math.max(EDGE, viewportHeight - EDGE - estimatedHeight);
  }

  return {
    left,
    top,
    maxHeight: Math.max(minHeight, viewportHeight - top - EDGE),
    originX,
  };
}

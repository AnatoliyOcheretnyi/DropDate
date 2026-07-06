"use client";

import { useRef, type MouseEvent } from "react";
import { CoverImage } from "../../../shared/ui/CoverImage";

type Props = {
  src?: string;
  alt: string;
  badge?: string | null;
};

export function TitleDetailsPoster({ src, alt, badge }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (event: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) {
      return;
    }
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--rx", `${(-py * 7).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(px * 9).toFixed(2)}deg`);
    el.style.setProperty("--gx", `${((px + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--gy", `${((py + 0.5) * 100).toFixed(1)}%`);
  };

  const reset = () => {
    const el = ref.current;
    if (!el) {
      return;
    }
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  return (
    <div
      className="details-poster"
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
    >
      <div className="details-poster__inner">
        {src ? (
          <CoverImage src={src} alt={alt} sizes="240px" priority />
        ) : (
          <span className="details-poster__fallback" aria-hidden="true">
            🎬
          </span>
        )}
        <span className="details-poster__sheen" aria-hidden="true" />
      </div>
      {badge ? <span className="details-poster__badge">{badge}</span> : null}
    </div>
  );
}

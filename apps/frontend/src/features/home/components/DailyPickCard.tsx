"use client";

import { CoverImage } from "../../../shared/ui/CoverImage";
import type { Suggestion } from "../../../shared/lib/release";
import type { DailyPick } from "../hooks/useDailyPick";

export function DailyPickCard({ pick, saved, onSelect, onToggleSave }: {
  pick: DailyPick;
  saved: boolean;
  onSelect: (suggestion: Suggestion) => void;
  onToggleSave: (suggestion: Suggestion) => void;
}) {
  const suggestion: Suggestion = { id: pick.tmdbId, mediaType: pick.mediaType, title: pick.title, year: pick.year, posterUrl: pick.posterUrl };
  return (
    <section className="daily-pick">
      <div className="daily-pick__glow" aria-hidden="true" />
      <div className="daily-pick__poster">
        {pick.posterUrl ? <CoverImage src={pick.posterUrl} alt={pick.title} sizes="(max-width: 700px) 42vw, 240px" /> : <span>{pick.title.slice(0, 1)}</span>}
      </div>
      <div className="daily-pick__content">
        <p className="eyebrow">Ваш пік дня</p>
        <h2>{pick.title}</h2>
        <p className="daily-pick__meta">{pick.mediaType === "movie" ? "Фільм" : "Серіал"}{pick.year ? ` · ${pick.year}` : ""}</p>
        <p className="daily-pick__reason">{pick.reason.text || "Один персональний вибір на сьогодні."}</p>
        <div className="daily-pick__actions">
          <button type="button" className="primary" onClick={() => onSelect(suggestion)}>Детальніше</button>
          <button type="button" className="daily-pick__save" onClick={() => onToggleSave(suggestion)}>{saved ? "У списку ✓" : "+ Хочу подивитись"}</button>
        </div>
      </div>
      <span className="daily-pick__stamp" aria-hidden="true">01</span>
    </section>
  );
}

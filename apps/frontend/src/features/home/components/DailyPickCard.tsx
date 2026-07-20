"use client";

import { useMemo } from "react";
import { CoverImage } from "../../../shared/ui/CoverImage";
import type { Suggestion } from "../../../shared/lib/release";
import type { DailyPick } from "../hooks/useDailyPick";

export function DailyPickCard({ pick, saved, action, revealed, busy, onReveal, onSelect, onToggleSave, onDislike }: {
  pick: DailyPick;
  saved: boolean;
  action: "none" | "saved" | "disliked";
  revealed: boolean;
  busy?: boolean;
  onReveal: () => void;
  onSelect: (suggestion: Suggestion) => void;
  onToggleSave: (suggestion: Suggestion) => void;
  onDislike: () => void;
}) {
  const suggestion: Suggestion = { id: pick.tmdbId, mediaType: pick.mediaType, title: pick.title, year: pick.year, posterUrl: pick.posterUrl };
  const dailyLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("uk-UA", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(`${pick.date}T00:00:00Z`)),
    [pick.date]
  );
  const watchLabel = useMemo(() => {
    if (action === "saved" || saved) {
      return "Супер, додано ✓";
    }
    return "+ Хочу подивитись";
  }, [action, saved]);
  return (
    <section className={`daily-pick${revealed ? " is-revealed" : " is-hidden"}`}>
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
          <button type="button" className="primary" onClick={() => onSelect(suggestion)} disabled={!revealed}>Детальніше</button>
          <button type="button" className="daily-pick__save" onClick={() => onToggleSave(suggestion)} disabled={!revealed || busy || action === "disliked"}>{watchLabel}</button>
          <button type="button" className={`daily-pick__ghost${action === "disliked" ? " is-active" : ""}`} onClick={onDislike} disabled={!revealed || busy || action === "saved"}>
            {action === "disliked" ? "Сумно, не зайшло" : "Не зайшло"}
          </button>
        </div>
      </div>
      {!revealed ? (
        <button
          type="button"
          className="daily-pick__spoiler"
          onClick={onReveal}
          disabled={busy}
          aria-label={`Відкрити фільм дня за ${dailyLabel}`}
        >
          <div className="daily-pick__spoiler-chip">Фільм дня</div>
          <strong>{busy ? "Відкриваємо..." : "Торкнись, щоб відкрити"}</strong>
          <span>Сьогоднішній персональний пік уже готовий. Натисни, щоб зняти spoiler.</span>
        </button>
      ) : null}
      <span className="daily-pick__stamp" aria-hidden="true">01</span>
    </section>
  );
}

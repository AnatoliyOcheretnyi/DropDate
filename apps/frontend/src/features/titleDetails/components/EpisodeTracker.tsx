"use client";

import Image from "next/image";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Details } from "../../../shared/lib/release";
import { useAuth } from "../../../shared/state/auth";

type Progress = { seasonNumber: number; episodeNumber: number; watched: boolean; rating?: number };
type EpisodeMeta = { episodeNumber: number; name: string; airDate?: string; runtime?: number; stillUrl?: string };
type Season = NonNullable<Details["seasons"]>[number];

function SeasonBlock({ season, tmdbId, accessToken, progress, update, defaultOpen }: { season: Season; tmdbId: number; accessToken: string; progress: Map<string, Progress>; update: (body: Record<string, unknown>) => void; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const metadata = useQuery({ queryKey: ["episode-metadata", tmdbId, season.seasonNumber], enabled: open, queryFn: async () => { const response = await fetch(`/api/episodes/metadata?tmdbId=${tmdbId}&season=${season.seasonNumber}`, { headers: { authorization: `Bearer ${accessToken}` } }); if (!response.ok) return [] as EpisodeMeta[]; return ((await response.json()).items ?? []) as EpisodeMeta[]; }, staleTime: 3_600_000 });
  const meta = new Map((metadata.data ?? []).map((item) => [item.episodeNumber, item]));
  const watchedCount = Array.from({ length: season.episodeCount }, (_, i) => progress.get(`${season.seasonNumber}:${i + 1}`)?.watched).filter(Boolean).length;
  const percent = season.episodeCount ? Math.round((watchedCount / season.episodeCount) * 100) : 0;
  return <details open={open} onToggle={(event) => setOpen(event.currentTarget.open)}>
    <summary><div><strong>{season.name || `Сезон ${season.seasonNumber}`}</strong><small>{season.airDate ? new Date(season.airDate).getFullYear() : `${season.episodeCount} епізодів`}</small></div><div className="episode-tracker__season-progress"><span><i style={{ width: `${percent}%` }} /></span><b>{watchedCount}/{season.episodeCount}</b></div></summary>
    <div className="episode-tracker__bulk"><button onClick={() => update({ seasonNumber: season.seasonNumber, episodeCount: season.episodeCount, watched: true })}>✓ Переглянуто все</button><button onClick={() => update({ seasonNumber: season.seasonNumber, episodeCount: season.episodeCount, watched: false })}>Скинути сезон</button></div>
    {metadata.isLoading ? <div className="episode-tracker__loading">Завантажуємо кадри епізодів…</div> : null}
    <div className="episode-tracker__grid">{Array.from({ length: season.episodeCount }, (_, index) => index + 1).map((episode) => { const item = progress.get(`${season.seasonNumber}:${episode}`); const info = meta.get(episode); return <article key={episode} className={item?.watched ? "is-watched" : ""}>
      <button className="episode-tracker__still" aria-label={`${item?.watched ? "Скасувати перегляд" : "Позначити переглянутим"}: серія ${episode}`} onClick={() => update({ seasonNumber: season.seasonNumber, episodeNumber: episode, watched: !item?.watched })}>{info?.stillUrl ? <Image src={info.stillUrl} alt="" fill sizes="(max-width: 600px) 78vw, 260px" /> : <span className="episode-tracker__still-number">E{String(episode).padStart(2, "0")}</span>}<span className="episode-tracker__check">✓</span></button>
      <div className="episode-tracker__meta"><div><strong>{info?.name || `Серія ${episode}`}</strong><small>{info?.airDate ? new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "short", year: "numeric" }).format(new Date(info.airDate)) : `S${String(season.seasonNumber).padStart(2, "0")}E${String(episode).padStart(2, "0")}`}{info?.runtime ? ` · ${info.runtime} хв` : ""}</small></div><label><span>Твоя оцінка</span><select aria-label={`Оцінка серії ${episode}`} value={item?.rating ?? ""} onChange={(event) => { const rating = Number(event.target.value); if (rating) update({ seasonNumber: season.seasonNumber, episodeNumber: episode, rating }); }}><option value="">—</option>{Array.from({ length: 10 }, (_, value) => value + 1).map((rating) => <option key={rating} value={rating}>{rating}</option>)}</select></label></div>
    </article>; })}</div>
  </details>;
}

export function EpisodeTracker({ details }: { details: Details }) {
  const { user, accessToken } = useAuth(); const client = useQueryClient(); const key = ["episodes", user?.id, details.id];
  const query = useQuery({ queryKey: key, enabled: Boolean(user && accessToken && details.mediaType === "tv"), queryFn: async () => { const response = await fetch(`/api/episodes?tmdbId=${details.id}`, { headers: { authorization: `Bearer ${accessToken}` } }); if (!response.ok) throw new Error("progress failed"); return ((await response.json()).items ?? []) as Progress[]; } });
  const mutation = useMutation({ mutationFn: async (body: Record<string, unknown>) => { const response = await fetch("/api/episodes", { method: "POST", headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json" }, body: JSON.stringify({ tmdbId: details.id, ...body }) }); if (!response.ok) throw new Error("update failed"); }, onSuccess: () => { void client.invalidateQueries({ queryKey: key }); void client.invalidateQueries({ queryKey: ["continue-watching", user?.id] }); } });
  if (!user || !accessToken || details.mediaType !== "tv" || !details.seasons?.length) return null;
  const progress = new Map((query.data ?? []).map((item) => [`${item.seasonNumber}:${item.episodeNumber}`, item]));
  return <section className="details-section episode-tracker"><header><div><p className="eyebrow">Твій прогрес</p><h2>Епізоди</h2><p>Відмічай переглянуте та зберігай власні оцінки.</p></div></header><div className="episode-tracker__seasons">{details.seasons.map((season) => <SeasonBlock key={season.seasonNumber} season={season} tmdbId={details.id} accessToken={accessToken} progress={progress} update={(body) => mutation.mutate(body)} defaultOpen={false} />)}</div></section>;
}

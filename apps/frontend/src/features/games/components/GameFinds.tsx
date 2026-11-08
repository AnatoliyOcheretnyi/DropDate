"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PosterCard } from "../../../shared/ui/PosterCard";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { useAuth } from "../../../shared/state/auth";
import { AuthModal } from "../../../widgets/AuthModal";
import type { Suggestion } from "../../../shared/lib/release";
import type { ListType } from "../../../shared/types/releases";
import type { GameTitleCard } from "../api/games";

export function GameFinds({ titles, heading = "Твої знахідки цього раунду" }: { titles: GameTitleCard[]; heading?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const { getListTypes, setSuggestionLists } = useSavedReleases();
  const unique = useMemo(() => [...new Map(titles.map(item => [`${item.mediaType}:${item.tmdbId}`, item])).values()], [titles]);
  const items = unique.map(item => ({ ...item, id: item.tmdbId })).filter(item => !getListTypes(item).some(list => ["watched", "liked", "favorite", "disliked"].includes(list)));
  const change = (item: Suggestion, next: ListType[]) => {
    if (!user) { setAuthOpen(true); return; }
    setSuggestionLists(item, next, { title: item.title, type: item.mediaType === "movie" ? "movie" : "series", nextRelease: "", source: "tmdb", posterUrl: item.posterUrl, status: "released" });
  };
  if (!items.length) return null;
  return <section className="game-finds">
    <h3>{heading}</h3>
    <p>Збережи те, що зацікавило. Уже переглянуте тут не показуємо.</p>
    <div className="game-finds__grid">{items.map(item => {
      const lists = getListTypes(item);
      const wanted = lists.includes("watchlist");
      return <div key={`${item.mediaType}:${item.id}`}>
        <PosterCard item={item} listTypes={lists} imageSizes="180px" onSelect={title => router.push(`/title/${title.mediaType}/${title.id}`)} onChangeLists={change} />
        <button type="button" className="game-finds__save" aria-pressed={wanted} onClick={() => change(item, wanted ? lists.filter(list => list !== "watchlist") : [...lists, "watchlist"])}>{wanted ? "✓ У «Хочу»" : "+ Хочу подивитись"}</button>
      </div>;
    })}</div>
    <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
  </section>;
}

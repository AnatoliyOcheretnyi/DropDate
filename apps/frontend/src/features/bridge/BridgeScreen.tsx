"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Header } from "../../widgets/Header";
import { AuthModal } from "../../widgets/AuthModal";
import { PickCard } from "../../shared/ui/PickCard";
import { useAuth } from "../../shared/state/auth";
import { useSavedReleases } from "../saved/hooks/useSavedReleases";

type BridgeItem = {
  tmdbId: number; mediaType: "movie" | "tv"; title: string; year?: string;
  posterUrl?: string; rating?: number; country: string; countryCode: string; reason: string;
};

export function BridgeScreen() {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const { saved, getListTypes, toggleListType } = useSavedReleases();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [adventure, setAdventure] = useState(2);
  const [mediaType, setMediaType] = useState<"movie" | "tv">("movie");
  const [runtimeLTE, setRuntimeLTE] = useState(0);

  const query = useQuery({
    queryKey: ["bridge", user?.id, adventure, mediaType, runtimeLTE],
    enabled: Boolean(user && accessToken),
    queryFn: async ({ signal }) => {
      const params = new URLSearchParams({ adventure: String(adventure), mediaType });
      if (runtimeLTE) params.set("runtimeLTE", String(runtimeLTE));
      const response = await fetch(`/api/bridge?${params}`, {
        headers: { authorization: `Bearer ${accessToken}` }, signal,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Не вдалося побудувати міст");
      return payload.items as BridgeItem[];
    },
  });

  return (
    <main className="page page--bridge">
      <Header active="home" savedCount={saved.length} onChange={(view) => router.push(view === "saved" ? "/saved" : "/")} isSearchOpen={false} onSearchToggle={() => router.push("/")} onSearchClose={() => undefined} />
      <section className="bridge-shell">
        <div className="bridge-hero">
          <p className="eyebrow">Cross-cultural Bridge</p>
          <h1>Від знайомого смаку<br />до нового кіно.</h1>
          <p>П’ять gateway-тайтлів із різних кінокультур. Не випадковість, а зрозумілий зв’язок із тим, що тобі вже подобається.</p>
        </div>

        <div className="bridge-controls">
          <label>Рівень пригоди <strong>{adventure}/3</strong><input type="range" min="1" max="3" value={adventure} onChange={(event) => setAdventure(Number(event.target.value))} /></label>
          <div><button className={mediaType === "movie" ? "is-active" : ""} onClick={() => setMediaType("movie")}>Фільми</button><button className={mediaType === "tv" ? "is-active" : ""} onClick={() => setMediaType("tv")}>Серіали</button></div>
          <select value={runtimeLTE} onChange={(event) => setRuntimeLTE(Number(event.target.value))} disabled={mediaType === "tv"}>
            <option value="0">Будь-яка тривалість</option><option value="100">До 100 хв</option><option value="130">До 130 хв</option>
          </select>
        </div>

        {!user ? <div className="bridge-empty"><h2>Увійди, щоб побудувати свій міст</h2><button className="primary" onClick={() => setIsAuthOpen(true)}>Увійти</button></div> : null}
        {query.isLoading ? <div className="bridge-empty">Шукаємо зв’язки між кінокультурами…</div> : null}
        {query.error ? <div className="bridge-empty">{query.error.message}</div> : null}
        <div className="mood-grid bridge-grid">
          {(query.data ?? []).map((item) => {
            const suggestion = { id: item.tmdbId, mediaType: item.mediaType, title: item.title, year: item.year, posterUrl: item.posterUrl };
            const savedItem = getListTypes(suggestion).includes("watchlist");
            return <PickCard key={`${item.mediaType}-${item.tmdbId}`} item={item} onDetails={() => router.push(`/title/${item.mediaType}/${item.tmdbId}`)} meta={<><span>{item.country}</span><span className="bridge-reason">{item.reason}</span></>} secondaryAction={<button className={`mood-card-action${savedItem ? " saved" : ""}`} onClick={() => toggleListType(suggestion, "watchlist", { title: item.title, type: item.mediaType === "movie" ? "movie" : "series", nextRelease: "", source: "tmdb", posterUrl: item.posterUrl, status: "released" })}>{savedItem ? "Збережено ✓" : "+ Зберегти"}</button>} />;
          })}
        </div>
      </section>
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </main>
  );
}

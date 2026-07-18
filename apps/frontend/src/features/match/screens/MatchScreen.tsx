"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "../../../widgets/Header";
import { AuthModal } from "../../../widgets/AuthModal";
import { PickCard } from "../../../shared/ui/PickCard";
import type { ReleaseInfo, Suggestion } from "../../../shared/lib/release";
import { useAuth } from "../../../shared/state/auth";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { useMatchSession } from "../hooks/useMatchSession";
import type { MatchPick } from "../api/match";

const toSuggestion = (pick: MatchPick): Suggestion => ({
  id: pick.tmdbId,
  title: pick.title,
  mediaType: pick.mediaType,
  year: pick.year,
  posterUrl: pick.posterUrl,
});

const toRelease = (pick: MatchPick): ReleaseInfo => ({
  title: pick.title,
  type: pick.mediaType === "movie" ? "movie" : "series",
  nextRelease: "",
  source: "tmdb",
  posterUrl: pick.posterUrl,
  status: "released",
});

export function MatchScreen() {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const { saved, getListTypes, toggleListType } = useSavedReleases();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const {
    status,
    current,
    index,
    total,
    answers,
    picks,
    canRefine,
    start,
    answer,
    refine,
    more,
    dismissPick,
    likePick,
    reset,
  } = useMatchSession(accessToken);

  const isAuthed = Boolean(user && accessToken);

  const openDetails = useCallback(
    (pick: MatchPick) => router.push(`/title/${pick.mediaType}/${pick.tmdbId}`),
    [router]
  );

  const handleSave = useCallback(
    (pick: MatchPick) => {
      if (!isAuthed) {
        setIsAuthOpen(true);
        return;
      }
      toggleListType(toSuggestion(pick), "watchlist", toRelease(pick));
    },
    [isAuthed, toggleListType]
  );

  const isSaved = useCallback(
    (pick: MatchPick) => getListTypes(toSuggestion(pick)).length > 0,
    [getListTypes]
  );

  return (
    <main className="page page--mood">
      <Header
        active="match"
        savedCount={saved.length}
        onChange={(view) => router.push(view === "saved" ? "/saved" : "/")}
        isSearchOpen={false}
        onSearchToggle={() => router.push("/")}
        onSearchClose={() => undefined}
      />

      <section className="mood-shell">
        {status === "config" && (
          <div className="mood-intro">
            <p className="eyebrow">Кінопідбірник</p>
            <h1>Звузимо до ідеального</h1>
            <p className="mood-lead">
              Відповідай на кілька питань — щокроку показуватимемо добірку фільмів
              і серіалів, що все ближче до того, що ти хочеш.
            </p>
            <div className="mood-depths">
              <button
                type="button"
                className="mood-depth-card"
                onClick={() => void start()}
              >
                <strong>Почати підбір</strong>
                <span>Фільми, серіали, аніме й дорами разом</span>
                <div className="mood-depth-cta">Поїхали →</div>
              </button>
            </div>
          </div>
        )}

        {status === "loading" && <div className="mood-loading">Підбираємо…</div>}

        {status === "asking" && current && (
          <div className="mood-question">
            <div className="mood-progress" aria-hidden="true">
              {Array.from({ length: total }).map((_, i) => (
                <span
                  key={i}
                  className={`mood-progress-dot${i <= index ? " active" : ""}`}
                />
              ))}
            </div>
            <p className="mood-step-label">
              Питання {index + 1} / {total}
            </p>
            <h2 className="mood-question-title">{current.title}</h2>
            <div className="mood-options">
              {current.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`mood-option${
                    answers[current.id] === option.id ? " selected" : ""
                  }`}
                  onClick={() => answer(option.id)}
                >
                  {option.emoji ? (
                    <span className="mood-option-emoji" aria-hidden="true">
                      {option.emoji}
                    </span>
                  ) : null}
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {status === "results" && (
          <div className="mood-results">
            <div className="mood-results-head">
              <h2>Що скажеш на це?</h2>
              <p>Обери тайтл або уточни далі, щоб звузити вибір.</p>
            </div>

            <div className="mood-grid">
              {picks.map((pick) => {
                const saved = isSaved(pick);
                return (
                  <PickCard
                    key={`${pick.mediaType}-${pick.tmdbId}`}
                    item={pick}
                    onDetails={() => openDetails(pick)}
                    meta={
                      <>
                        <span>{pick.mediaType === "movie" ? "Фільм" : "Серіал"}</span>
                        {pick.year ? <span>{pick.year}</span> : null}
                      </>
                    }
                    secondaryAction={
                      <div className="mood-card-feedback">
                      <button type="button" className="mood-card-feedback__like" onClick={() => void likePick(pick)}>Більше схожого</button>
                      <button
                        type="button"
                        className="mood-card-feedback__dismiss"
                        onClick={() => dismissPick(pick)}
                      >
                        Не моє
                      </button>
                      <button
                        type="button"
                        className={`mood-card-action mood-card-action--save${
                          saved ? " saved" : ""
                        }`}
                        onClick={() => handleSave(pick)}
                      >
                        {saved ? "У списку ✓" : "Зберегти"}
                      </button>
                      </div>
                    }
                  />
                );
              })}
            </div>

            <div className="mood-results-actions">
              {canRefine ? (
                <button type="button" className="primary" onClick={refine}>
                  Уточнити далі
                </button>
              ) : (
                <button type="button" className="primary" onClick={more}>
                  Ще варіанти
                </button>
              )}
              <button type="button" onClick={reset}>
                Спочатку
              </button>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="mood-empty">
            <h2>Щось пішло не так</h2>
            <p>Не вдалося підібрати. Спробуй ще раз.</p>
            <button type="button" className="primary" onClick={reset}>
              Спочатку
            </button>
          </div>
        )}
      </section>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </main>
  );
}

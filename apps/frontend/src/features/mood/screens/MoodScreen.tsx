"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "../../../widgets/Header";
import { AuthModal } from "../../../widgets/AuthModal";
import type { ReleaseInfo, Suggestion } from "../../../shared/lib/release";
import { useAuth } from "../../../shared/state/auth";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { useMoodSession } from "../hooks/useMoodSession";
import { MoodQuestionCard } from "../components/MoodQuestionCard";
import { MoodResults } from "../components/MoodResults";
import type { MoodPick } from "../api/mood";

const DEPTHS: { id: string; title: string; description: string }[] = [
  {
    id: "quick",
    title: "Швидко",
    description: "3 питання — і одразу добірка",
  },
  {
    id: "standard",
    title: "Звичайно",
    description: "5 питань для точнішого підбору",
  },
];

const toSuggestion = (pick: MoodPick): Suggestion => ({
  id: pick.tmdbId,
  title: pick.title,
  mediaType: pick.mediaType,
  year: pick.year,
  posterUrl: pick.posterUrl,
});

const toRelease = (pick: MoodPick): ReleaseInfo => ({
  title: pick.title,
  type: "movie",
  nextRelease: "",
  source: "tmdb",
  posterUrl: pick.posterUrl,
  status: "released",
});

export function MoodScreen() {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const { saved, getListTypes, toggleListType } = useSavedReleases();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const {
    status,
    current,
    stepIndex,
    total,
    answers,
    picks,
    start,
    answer,
    back,
    showMore,
    reset,
  } = useMoodSession(accessToken);

  const isAuthed = Boolean(user && accessToken);

  const handleDetails = useCallback(
    (pick: MoodPick) => {
      router.push(`/title/${pick.mediaType}/${pick.tmdbId}`);
    },
    [router]
  );

  const handleSave = useCallback(
    (pick: MoodPick) => {
      if (!isAuthed) {
        setIsAuthOpen(true);
        return;
      }
      toggleListType(toSuggestion(pick), "watchlist", toRelease(pick));
    },
    [isAuthed, toggleListType]
  );

  const isSaved = useCallback(
    (pick: MoodPick) => getListTypes(toSuggestion(pick)).length > 0,
    [getListTypes]
  );

  return (
    <main className="page page--mood">
      <Header
        active="mood"
        savedCount={saved.length}
        onChange={(view) => router.push(view === "saved" ? "/saved" : "/")}
        isSearchOpen={false}
        onSearchToggle={() => router.push("/")}
        onSearchClose={() => undefined}
      />

      <section className="mood-shell">
        {status === "config" && (
          <div className="mood-intro">
            <p className="eyebrow">Підбір за настроєм</p>
            <h1>Не знаєш що подивитись?</h1>
            <p className="mood-lead">
              Дай відповідь на кілька питань — і ми підберемо фільм під твій
              настрій, час і компанію.
            </p>
            <div className="mood-depths">
              {DEPTHS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className="mood-depth-card"
                  onClick={() => void start(option.id)}
                >
                  <strong>{option.title}</strong>
                  <span>{option.description}</span>
                  <div className="mood-depth-cta">Почати →</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {status === "loading" && (
          <div className="mood-loading">Підбираємо…</div>
        )}

        {status === "asking" && current && (
          <MoodQuestionCard
            question={current}
            stepIndex={stepIndex}
            total={total}
            selected={answers[current.id]}
            onAnswer={answer}
            onBack={back}
          />
        )}

        {status === "results" && (
          <MoodResults
            picks={picks}
            onMore={showMore}
            onReset={reset}
            onDetails={handleDetails}
            onSave={handleSave}
            isSaved={isSaved}
          />
        )}

        {status === "empty" && (
          <div className="mood-empty">
            <h2>Нічого не знайшли</h2>
            <p>Спробуй змінити відповіді — наприклад, послабити вимоги до часу.</p>
            <button type="button" className="primary" onClick={reset}>
              Спробувати ще раз
            </button>
          </div>
        )}

        {status === "error" && (
          <div className="mood-empty">
            <h2>Щось пішло не так</h2>
            <p>Не вдалося підібрати фільми. Спробуй ще раз.</p>
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

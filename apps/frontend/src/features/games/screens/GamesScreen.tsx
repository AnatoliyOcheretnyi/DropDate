"use client";

import { useCallback, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Header } from "../../../widgets/Header";
import { AuthModal } from "../../../widgets/AuthModal";
import type { ReleaseInfo, Suggestion } from "../../../shared/lib/release";
import { useAuth } from "../../../shared/state/auth";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { useGameSession } from "../hooks/useGameSession";
import { GameQuestionCard } from "../components/GameQuestionCard";
import { GameRevealPanel } from "../components/GameRevealPanel";
import type { GameMode, GameTitleCard } from "../api/games";

const SESSION_LENGTH = 10;

const MODES: {
  mode: GameMode;
  title: string;
  description: string;
  icon: ReactNode;
}[] = [
  {
    mode: "release_date",
    title: "Що вийшло раніше?",
    description: "Вгадай, який фільм зʼявився першим",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7 2v2H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h14a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3h-2V2h-2v2H9V2H7Zm13 7v10a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9h16Zm-9 3H6v2h5v-2Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
  {
    mode: "rating",
    title: "У кого рейтинг вищий?",
    description: "Порівняй оцінки TMDB двох фільмів",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 2.5l2.9 5.9 6.5.95-4.7 4.58 1.11 6.47L12 16.9l-5.81 3.06 1.11-6.47-4.7-4.58 6.5-.95L12 2.5Z"
          fill="currentColor"
        />
      </svg>
    ),
  },
];

const toSuggestion = (card: GameTitleCard): Suggestion => ({
  id: card.tmdbId,
  title: card.title,
  mediaType: card.mediaType,
  year: card.year,
  posterUrl: card.posterUrl,
});

const toRelease = (card: GameTitleCard): ReleaseInfo => ({
  title: card.title,
  type: "movie",
  nextRelease: "",
  source: "tmdb",
  posterUrl: card.posterUrl,
  status: "released",
});

export function GamesScreen() {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const { saved, getListTypes, toggleListType } = useSavedReleases();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const {
    status,
    mode,
    question,
    questionNumber,
    totalQuestions,
    selected,
    isRevealed,
    score,
    streak,
    bestStreak,
    lives,
    maxLives,
    isOutOfLives,
    start,
    selectAnswer,
    next,
    reset,
  } = useGameSession();

  const isAuthed = Boolean(user && accessToken);

  const handleDetails = useCallback(
    (card: GameTitleCard) => {
      router.push(`/title/${card.mediaType}/${card.tmdbId}`);
    },
    [router]
  );

  const handleSave = useCallback(
    (card: GameTitleCard) => {
      if (!isAuthed) {
        setIsAuthOpen(true);
        return;
      }
      toggleListType(toSuggestion(card), "watchlist", toRelease(card));
    },
    [isAuthed, toggleListType]
  );

  const isCardSaved = useCallback(
    (card: GameTitleCard) => getListTypes(toSuggestion(card)).length > 0,
    [getListTypes]
  );

  const cardState = (side: "left" | "right") => {
    if (!isRevealed || !question) {
      return "idle" as const;
    }
    if (side === question.answer) {
      return "correct" as const;
    }
    if (side === selected) {
      return "wrong" as const;
    }
    return "idle" as const;
  };

  return (
    <main className="page page--games">
      <Header
        active="games"
        savedCount={saved.length}
        onChange={(view) => router.push(view === "saved" ? "/saved" : "/")}
        isSearchOpen={false}
        onSearchToggle={() => router.push("/")}
        onSearchClose={() => undefined}
      />

      <section className={`games-shell${status === "playing" ? " games-shell--playing" : ""}`}>
        {status !== "playing" && status !== "finished" && (
          <div className="games-head">
            <p className="eyebrow">Міні-ігри</p>
            <h1>Кіно-баттл</h1>
            <p className="games-lead">
              Швидка гра на порівняння фільмів. Вгадуй, відкривай деталі й додавай
              у список прямо під час гри.
            </p>
          </div>
        )}

        {(status === "idle" || status === "error") && (
          <div className="games-modes">
            {status === "error" && (
              <p className="games-error">
                Не вдалося зібрати гру. Спробуй інший режим або пізніше.
              </p>
            )}
            {MODES.map((option) => (
              <button
                key={option.mode}
                type="button"
                className={`games-mode-card games-mode-card--${option.mode}`}
                onClick={() => void start(option.mode, SESSION_LENGTH)}
              >
                <div className="games-mode-card__icon" aria-hidden="true">
                  {option.icon}
                </div>
                <strong>{option.title}</strong>
                <span>{option.description}</span>
                <div className="games-mode-card__cta">Грати →</div>
              </button>
            ))}
          </div>
        )}

        {status === "loading" && (
          <div className="games-loading">Готуємо запитання…</div>
        )}

        {status === "playing" && question && (
          <div className="games-round">
            <aside className="games-round__side">
              <p className="games-prompt">{question.prompt}</p>
              <div className="games-scorebar">
                <span>
                  Питання {questionNumber} / {totalQuestions}
                </span>
                <span>Рахунок: {score}</span>
                <span>Серія: {streak}</span>
                <span
                  className="games-lives"
                  aria-label={`Життя: ${lives} з ${maxLives}`}
                >
                  {Array.from({ length: maxLives }).map((_, i) => (
                    <span
                      key={i}
                      className={`games-life${i < lives ? "" : " games-life--lost"}`}
                      aria-hidden="true"
                    >
                      ♥
                    </span>
                  ))}
                </span>
              </div>
            </aside>

            <div className="games-round__board">
              <div className="games-board">
                <GameQuestionCard
                  card={question.left}
                  mode={question.mode}
                  state={cardState("left")}
                  isRevealed={isRevealed}
                  disabled={isRevealed}
                  isSaved={isCardSaved(question.left)}
                  onSelect={() => selectAnswer("left")}
                  onDetails={() => handleDetails(question.left)}
                  onSave={() => handleSave(question.left)}
                />
                <div className="games-vs" aria-hidden="true">
                  VS
                </div>
                <GameQuestionCard
                  card={question.right}
                  mode={question.mode}
                  state={cardState("right")}
                  isRevealed={isRevealed}
                  disabled={isRevealed}
                  isSaved={isCardSaved(question.right)}
                  onSelect={() => selectAnswer("right")}
                  onDetails={() => handleDetails(question.right)}
                  onSave={() => handleSave(question.right)}
                />
              </div>
            </div>

            {isRevealed && (
              <GameRevealPanel
                isCorrect={selected === question.answer}
                isLast={isOutOfLives || questionNumber >= totalQuestions}
                onNext={next}
              />
            )}
          </div>
        )}

        {status === "finished" && (
          <div className="games-summary">
            <h2>{isOutOfLives ? "Життя скінчились" : "Гру завершено"}</h2>
            <div className="games-summary-stats">
              <div>
                <strong>
                  {score} / {totalQuestions}
                </strong>
                <span>Правильних</span>
              </div>
              <div>
                <strong>{bestStreak}</strong>
                <span>Найкраща серія</span>
              </div>
            </div>
            <div className="games-summary-actions">
              <button
                type="button"
                className="primary"
                onClick={() => mode && void start(mode, SESSION_LENGTH)}
              >
                Зіграти ще
              </button>
              <button type="button" onClick={reset}>
                Інший режим
              </button>
            </div>
          </div>
        )}
      </section>

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </main>
  );
}

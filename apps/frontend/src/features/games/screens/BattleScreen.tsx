"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthModal } from "../../../widgets/AuthModal";
import type { ReleaseInfo, Suggestion } from "../../../shared/lib/release";
import { useAuth } from "../../../shared/state/auth";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { useGameSession } from "../hooks/useGameSession";
import { useGameStats } from "../hooks/useGameStats";
import { GameQuestionCard } from "../components/GameQuestionCard";
import { GameRevealPanel } from "../components/GameRevealPanel";
import { Confetti } from "../components/Confetti";
import { ShareResultButton } from "../components/ShareResultButton";
import { GameShell } from "../components/GameShell";
import type { GameMode, GameTitleCard } from "../api/games";

const SESSION_LENGTH = 10;

const MODE_TITLES: Record<string, string> = {
  release_date: "Що вийшло раніше?",
  rating: "У кого рейтинг вищий?",
};

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

const squares = (results: boolean[]) =>
  results.map((ok) => (ok ? "🟩" : "🟥")).join("");

export function BattleScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, accessToken } = useAuth();
  const { getListTypes, toggleListType } = useSavedReleases();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const recordedRef = useRef(false);

  const modeParam = searchParams.get("mode");
  const mode: GameMode = modeParam === "rating" ? "rating" : "release_date";
  const endless = searchParams.get("endless") === "1";
  const daily = searchParams.get("daily") === "1";
  const statsKey = endless ? "streak" : `battle_${mode}`;
  const { record } = useGameStats(statsKey);

  const {
    status,
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

  useEffect(() => {
    recordedRef.current = false;
    setResults([]);
    void start(mode, { count: SESSION_LENGTH, endless, daily });
    return reset;
  }, [mode, endless, daily, start, reset]);

  // Track the per-question outcome for the shareable square row.
  const lastTrackedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isRevealed || !question || lastTrackedRef.current === question.id) {
      return;
    }
    lastTrackedRef.current = question.id;
    setResults((prev) => [...prev, selected === question.answer]);
  }, [isRevealed, question, selected]);

  useEffect(() => {
    if (status === "finished" && !recordedRef.current) {
      recordedRef.current = true;
      record(endless ? { streak: bestStreak } : { score, streak: bestStreak });
    }
  }, [status, record, endless, bestStreak, score]);

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

  const heading = endless
    ? "Стрік"
    : daily
      ? `Щоденний виклик · ${MODE_TITLES[mode]}`
      : MODE_TITLES[mode];

  const shareText = endless
    ? `DropDate · Стрік: ${bestStreak} 🔥`
    : `DropDate · ${MODE_TITLES[mode]}${daily ? ` · ${new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long" }).format(new Date())}` : ""}\n${score}/${results.length} ${squares(results)}`;

  const won = endless ? bestStreak >= 10 : results.length > 0 && score / results.length >= 0.7;

  return (
    <GameShell playing={status === "playing"}>
      {status === "loading" && (
        <div className="games-loading">
          <span className="games-loading__reel" aria-hidden="true" />
          Готуємо запитання…
        </div>
      )}

      {status === "error" && (
        <div className="games-error">
          Не вдалося зібрати гру. Спробуй ще раз трохи згодом.
        </div>
      )}

      {status === "playing" && question && question.left && question.right && (
        <div className="games-round">
          <aside className="games-round__side">
            <p className="games-kicker">{heading}</p>
            <p className="games-prompt">{question.prompt}</p>
            <div className="games-scorebar">
              {endless ? (
                <span className="games-streak-big">
                  Стрік: {streak} {streak >= 3 ? <em aria-hidden="true">🔥</em> : null}
                </span>
              ) : (
                <>
                  <span>
                    Питання {questionNumber} / {totalQuestions}
                  </span>
                  <span>Рахунок: {score}</span>
                  <span className={streak >= 3 ? "games-streak is-hot" : "games-streak"}>
                    Серія: {streak} {streak >= 3 ? <em aria-hidden="true">🔥</em> : null}
                  </span>
                </>
              )}
              <span className="games-lives" aria-label={`Життя: ${lives} з ${maxLives}`}>
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
            {!endless ? (
              <div className="games-progress" aria-hidden="true">
                <span
                  style={{
                    width: `${(((questionNumber - 1) + (isRevealed ? 1 : 0)) / Math.max(1, totalQuestions)) * 100}%`,
                  }}
                />
              </div>
            ) : null}
          </aside>

          <div className="games-round__board">
            <div
              key={question.id}
              className={`games-board games-board--enter${
                isRevealed && selected !== question.answer ? " games-board--missed" : ""
              }`}
            >
              <GameQuestionCard
                card={question.left}
                mode={question.mode}
                state={cardState("left")}
                isRevealed={isRevealed}
                disabled={isRevealed}
                isSaved={isCardSaved(question.left)}
                onSelect={() => selectAnswer("left")}
                onDetails={() => handleDetails(question.left!)}
                onSave={() => handleSave(question.left!)}
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
                onDetails={() => handleDetails(question.right!)}
                onSave={() => handleSave(question.right!)}
              />
            </div>
          </div>

          {isRevealed && (
            <GameRevealPanel
              isCorrect={selected === question.answer}
              isLast={isOutOfLives || (!endless && questionNumber >= totalQuestions)}
              onNext={next}
            />
          )}
        </div>
      )}

      {status === "finished" && (
        <div className="games-summary">
          {won ? <Confetti /> : null}
          <h2>
            {endless
              ? bestStreak >= 10
                ? "Вогонь! 🔥"
                : "Стрік обірвався"
              : isOutOfLives
                ? "Життя скінчились"
                : "Гру завершено"}
          </h2>
          <div className="games-summary-stats">
            {endless ? (
              <div>
                <strong>{bestStreak}</strong>
                <span>Твій стрік</span>
              </div>
            ) : (
              <>
                <div>
                  <strong>
                    {score} / {results.length}
                  </strong>
                  <span>Правильних</span>
                </div>
                <div>
                  <strong>{bestStreak}</strong>
                  <span>Найкраща серія</span>
                </div>
              </>
            )}
          </div>
          {!endless && results.length > 0 ? (
            <p className="games-squares" aria-hidden="true">
              {squares(results)}
            </p>
          ) : null}
          <div className="games-summary-actions">
            <button
              type="button"
              className="primary"
              onClick={() => {
                recordedRef.current = false;
                setResults([]);
                lastTrackedRef.current = null;
                void start(mode, { count: SESSION_LENGTH, endless, daily });
              }}
            >
              Зіграти ще
            </button>
            <ShareResultButton text={shareText} />
            <button type="button" onClick={() => router.push("/games")}>
              До ігор
            </button>
          </div>
        </div>
      )}

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </GameShell>
  );
}

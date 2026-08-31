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
import { GameShell } from "../components/GameShell";
import { GameHud } from "../components/GameHud";
import { GameStage } from "../components/GameStage";
import { GameSummary } from "../components/GameSummary";
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
  const format = searchParams.get("format");
  const endless = format === "survival" || searchParams.get("endless") === "1";
  const daily = searchParams.get("daily") === "1";
  const seed = searchParams.get("seed") ?? undefined;
  const challengeId = searchParams.get("challenge");
  const needsSetup = !daily && !challengeId && format !== "rounds" && format !== "survival" && searchParams.get("endless") !== "1";
  const statsKey = endless ? `survival_${mode}` : `battle_${mode}`;
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
    if (needsSetup) return reset;
    recordedRef.current = false;
    setResults([]);
    void start(mode, { count: SESSION_LENGTH, endless, daily, seed });
    return reset;
  }, [mode, endless, daily, seed, start, reset, needsSetup]);

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
      if (challengeId && accessToken) void fetch("/api/games/challenges",{method:"POST",headers:{authorization:`Bearer ${accessToken}`,"content-type":"application/json"},body:JSON.stringify({challengeId,score})});
    }
  }, [accessToken, challengeId, status, record, endless, bestStreak, score]);

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
    ? `Виживання · ${MODE_TITLES[mode]}`
    : daily
      ? `Щоденний виклик · ${MODE_TITLES[mode]}`
      : MODE_TITLES[mode];

  const shareText = endless
    ? `DropDate · Виживання: ${score} правильних · серія ${bestStreak} 🔥`
    : `DropDate · ${MODE_TITLES[mode]}${daily ? ` · ${new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long" }).format(new Date())}` : ""}\n${score}/${results.length} ${squares(results)}`;

  const won = endless ? bestStreak >= 10 : results.length > 0 && score / results.length >= 0.7;

  return (
    <GameShell playing={status === "playing"}>
      {needsSetup ? (
        <section className="games-setup">
          <p className="eyebrow">Налаштування гри</p>
          <h1>{MODE_TITLES[mode]}</h1>
          <p>Обери темп. Тип гри можна змінити перед кожним новим запуском.</p>
          <div className="games-setup__modes">
            <button type="button" onClick={() => router.push(`/games/battle?mode=${mode}&format=rounds`)}><span aria-hidden="true">⑩</span><strong>10 раундів</strong><small>Рівно 10 запитань. Помилки не завершують гру.</small><b>Почати →</b></button>
            <button type="button" onClick={() => router.push(`/games/battle?mode=${mode}&format=survival`)}><span aria-hidden="true">♥</span><strong>Виживання</strong><small>Три життя. Грай, доки вони не закінчаться.</small><b>Почати →</b></button>
          </div>
          <button type="button" className="games-setup__switch" onClick={() => router.push(`/games/battle?mode=${mode === "rating" ? "release_date" : "rating"}`)}>Змінити на «{MODE_TITLES[mode === "rating" ? "release_date" : "rating"]}»</button>
        </section>
      ) : null}
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
          <GameHud
            kicker={heading}
            mode={endless ? "survival" : "rounds"}
            metrics={
              endless
                ? [{ label: "Стрік", value: `${streak}`, hot: streak >= 3 }]
                : [
                    { label: "Питання", value: `${questionNumber} / ${totalQuestions}` },
                    { label: "Рахунок", value: `${score}` },
                    { label: "Серія", value: `${streak}`, hot: streak >= 3 },
                  ]
            }
            lives={endless ? { current: lives, max: maxLives } : undefined}
            progress={
              endless
                ? undefined
                : (questionNumber - 1 + (isRevealed ? 1 : 0)) / Math.max(1, totalQuestions)
            }
          />

          <div className="games-round__board">
            <GameStage
              roundKey={question.id}
              state={isRevealed ? (selected === question.answer ? "correct" : "wrong") : "idle"}
              className="games-board"
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
            </GameStage>
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
        <GameSummary
          title={
            endless
              ? bestStreak >= 10
                ? "Вогонь! 🔥"
                : "Стрік обірвався"
              : isOutOfLives
                ? "Життя скінчились"
                : "Гру завершено"
          }
          stats={
            endless
              ? [{ label: "Твій стрік", value: bestStreak }]
              : [
                  { label: "Правильних", value: `${score} / ${results.length}` },
                  { label: "Найкраща серія", value: bestStreak },
                ]
          }
          squares={endless ? undefined : results}
          shareText={shareText}
          celebrate={won}
          onReplay={() => {
            recordedRef.current = false;
            setResults([]);
            lastTrackedRef.current = null;
            void start(mode, { count: SESSION_LENGTH, endless, daily });
          }}
        />
      )}

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </GameShell>
  );
}

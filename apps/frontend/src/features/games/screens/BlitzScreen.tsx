"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { fetchGameQuestions, type GameQuestion } from "../api/games";
import { Confetti } from "../components/Confetti";
import { GameShell } from "../components/GameShell";
import { ShareResultButton } from "../components/ShareResultButton";
import { useGameStats } from "../hooks/useGameStats";

const ROUNDS = 10;
const ROUND_MS = 12000;
const TICK_MS = 100;
const ADVANCE_DELAY_MS = 1700;

type Status = "loading" | "playing" | "finished" | "error";

const squares = (results: boolean[]) =>
  results.map((ok) => (ok ? "🟩" : "🟥")).join("");

export function BlitzScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const daily = searchParams.get("daily") === "1";
  const { record } = useGameStats("blitz");

  const [status, setStatus] = useState<Status>("loading");
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [timeLeft, setTimeLeft] = useState(ROUND_MS);
  const recordedRef = useRef(false);

  const load = useCallback(async () => {
    setStatus("loading");
    setIndex(0);
    setPicked(null);
    setRevealed(false);
    setResults([]);
    setTimeLeft(ROUND_MS);
    recordedRef.current = false;
    try {
      const items = await fetchGameQuestions("poster", ROUNDS, { daily });
      const playable = items.filter(
        (q) => q.card && (q.card.backdropUrl || q.card.posterUrl) && (q.options?.length ?? 0) >= 2
      );
      if (playable.length === 0) {
        setStatus("error");
        return;
      }
      setQuestions(playable);
      setStatus("playing");
    } catch {
      setStatus("error");
    }
  }, [daily]);

  useEffect(() => {
    void load();
  }, [load]);

  const question = questions[index] ?? null;

  const reveal = useCallback(
    (tmdbId: number | null) => {
      setPicked(tmdbId);
      setRevealed(true);
      setResults((prev) => [...prev, tmdbId !== null && tmdbId === question?.answerId]);
    },
    [question]
  );

  // Round countdown; running out counts as a miss.
  useEffect(() => {
    if (status !== "playing" || revealed) {
      return;
    }
    setTimeLeft(ROUND_MS);
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const left = ROUND_MS - (Date.now() - startedAt);
      if (left <= 0) {
        window.clearInterval(interval);
        reveal(null);
        return;
      }
      setTimeLeft(left);
    }, TICK_MS);
    return () => window.clearInterval(interval);
  }, [status, revealed, index, reveal]);

  // Auto-advance after the reveal beat.
  useEffect(() => {
    if (!revealed) {
      return;
    }
    const timeout = window.setTimeout(() => {
      if (index + 1 >= questions.length) {
        setStatus("finished");
      } else {
        setIndex((prev) => prev + 1);
        setPicked(null);
        setRevealed(false);
      }
    }, ADVANCE_DELAY_MS);
    return () => window.clearTimeout(timeout);
  }, [revealed, index, questions.length]);

  const score = results.filter(Boolean).length;

  useEffect(() => {
    if (status === "finished" && !recordedRef.current) {
      recordedRef.current = true;
      record({ score });
    }
  }, [status, record, score]);

  const shareText = `DropDate · Постер-бліц${daily ? ` · ${new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long" }).format(new Date())}` : ""}\n${score}/${results.length} ${squares(results)}`;

  return (
    <GameShell playing={status === "playing"}>
      {status === "loading" && (
        <div className="games-loading">
          <span className="games-loading__reel" aria-hidden="true" />
          Нарізаємо кадри…
        </div>
      )}

      {status === "error" && (
        <div className="games-error">Не вдалося зібрати гру. Спробуй пізніше.</div>
      )}

      {status === "playing" && question && question.card && (
        <div className="blitz" key={question.id}>
          <div className="blitz__top">
            <p className="games-kicker">
              {daily ? "Щоденний виклик · Постер-бліц" : "Постер-бліц"}
            </p>
            <span className="blitz__counter">
              {index + 1} / {questions.length} · Рахунок: {score}
            </span>
          </div>

          <div className="blitz__timer" aria-hidden="true">
            <span
              className={timeLeft < ROUND_MS * 0.25 ? "is-critical" : ""}
              style={{ width: `${(timeLeft / ROUND_MS) * 100}%` }}
            />
          </div>

          <div className={`blitz__frame${revealed ? " is-revealed" : ""}`}>
            <CoverImage
              src={question.card.backdropUrl || question.card.posterUrl || ""}
              alt="Кадр з фільму"
              sizes="(max-width: 900px) 100vw, 860px"
              priority
            />
            {revealed ? (
              <div className="blitz__answer">
                <strong>{question.card.title}</strong>
                {question.card.year ? <span>{question.card.year}</span> : null}
                <button
                  type="button"
                  className="blitz__details"
                  onClick={() =>
                    router.push(`/title/${question.card!.mediaType}/${question.card!.tmdbId}`)
                  }
                >
                  Деталі →
                </button>
              </div>
            ) : null}
          </div>

          <p className="games-prompt blitz__prompt">{question.prompt}</p>

          <div className="blitz__options">
            {(question.options ?? []).map((option) => {
              const stateClass = !revealed
                ? ""
                : option.tmdbId === question.answerId
                  ? " is-correct"
                  : option.tmdbId === picked
                    ? " is-wrong"
                    : " is-muted";
              return (
                <button
                  key={option.tmdbId}
                  type="button"
                  className={`blitz__option${stateClass}`}
                  disabled={revealed}
                  onClick={() => reveal(option.tmdbId)}
                >
                  {option.title}
                  {revealed && option.year ? <span> · {option.year}</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {status === "finished" && (
        <div className="games-summary">
          {results.length > 0 && score / results.length >= 0.7 ? <Confetti /> : null}
          <h2>{score >= 8 ? "Кіноман! 🎬" : "Гру завершено"}</h2>
          <div className="games-summary-stats">
            <div>
              <strong>
                {score} / {results.length}
              </strong>
              <span>Вгадано кадрів</span>
            </div>
          </div>
          <p className="games-squares" aria-hidden="true">
            {squares(results)}
          </p>
          <div className="games-summary-actions">
            <button type="button" className="primary" onClick={() => void load()}>
              Зіграти ще
            </button>
            <ShareResultButton text={shareText} />
            <button type="button" onClick={() => router.push("/games")}>
              До ігор
            </button>
          </div>
        </div>
      )}
    </GameShell>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { fetchGameQuestions, type GameQuestion } from "../api/games";
import { GameShell } from "../components/GameShell";
import { GameHud } from "../components/GameHud";
import { GameStage } from "../components/GameStage";
import { GameSummary } from "../components/GameSummary";
import { useGameStats } from "../hooks/useGameStats";

const ROUNDS = 8;
const MIN_YEAR = 1950;
// Exact hit scores 50; each year of distance costs 3 points of the base 30.
const pointsFor = (diff: number) => (diff === 0 ? 50 : Math.max(0, 30 - diff * 3));

type Status = "loading" | "playing" | "finished" | "error";

const actualYear = (q: GameQuestion) =>
  Number((q.card?.releaseDate ?? "").slice(0, 4)) || Number(q.card?.year) || 0;

export function YearScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const daily = searchParams.get("daily") === "1";
  const { record } = useGameStats("year");
  const maxYear = new Date().getFullYear();

  const [status, setStatus] = useState<Status>("loading");
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState(2000);
  const [revealed, setRevealed] = useState(false);
  const [points, setPoints] = useState<number[]>([]);
  const recordedRef = useRef(false);

  const load = useCallback(async () => {
    setStatus("loading");
    setIndex(0);
    setGuess(2000);
    setRevealed(false);
    setPoints([]);
    recordedRef.current = false;
    try {
      const items = await fetchGameQuestions("year", ROUNDS, { daily });
      const playable = items.filter((q) => actualYear(q) >= MIN_YEAR);
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
  const answer = question ? actualYear(question) : 0;
  const diff = Math.abs(guess - answer);
  const total = points.reduce((sum, p) => sum + p, 0);

  const confirm = () => {
    if (!question || revealed) {
      return;
    }
    setRevealed(true);
    setPoints((prev) => [...prev, pointsFor(diff)]);
  };

  const nextRound = () => {
    if (index + 1 >= questions.length) {
      setStatus("finished");
      return;
    }
    setIndex((prev) => prev + 1);
    setGuess(2000);
    setRevealed(false);
  };

  useEffect(() => {
    if (status === "finished" && !recordedRef.current) {
      recordedRef.current = true;
      record({ score: total });
    }
  }, [status, record, total]);

  const decades = useMemo(() => {
    const first = Math.ceil(MIN_YEAR / 20) * 20;
    const ticks: number[] = [];
    for (let year = first; year <= maxYear; year += 20) {
      ticks.push(year);
    }
    return ticks;
  }, [maxYear]);

  const maxTotal = questions.length * 50;
  const shareText = `DropDate · Вгадай рік${daily ? ` · ${new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long" }).format(new Date())}` : ""}\n${total}/${maxTotal} очок`;

  return (
    <GameShell playing={status === "playing"}>
      {status === "loading" && (
        <div className="games-loading">
          <span className="games-loading__reel" aria-hidden="true" />
          Перемотуємо плівку…
        </div>
      )}

      {status === "error" && (
        <div className="games-error">Не вдалося зібрати гру. Спробуй пізніше.</div>
      )}

      {status === "playing" && question && question.card && (
        <GameStage
          roundKey={question.id}
          state={revealed ? (diff <= 2 ? "correct" : "wrong") : "idle"}
          className="yeargame"
        >
          <GameHud
            kicker={daily ? "Щоденний виклик · Вгадай рік" : "Вгадай рік"}
            metrics={[
              { label: "Тайтл", value: `${index + 1} / ${questions.length}` },
              { label: "Очки", value: `${total}` },
            ]}
            progress={(index + (revealed ? 1 : 0)) / Math.max(1, questions.length)}
          />

          <div className="yeargame__stage">
            <div className={`yeargame__poster${revealed ? " is-revealed" : ""}`}>
              {question.card.posterUrl ? (
                <CoverImage
                  src={question.card.posterUrl}
                  alt={question.card.title}
                  sizes="(max-width: 640px) 60vw, 260px"
                  priority
                />
              ) : null}
            </div>
            <div className="yeargame__panel">
              <h2 className="yeargame__title">{question.card.title}</h2>
              <p className="games-prompt">{question.prompt}</p>

              <div className={`yeargame__value${revealed ? " is-locked" : ""}`}>
                {revealed ? (
                  <>
                    <span className="yeargame__guess">{guess}</span>
                    <span className="yeargame__arrow" aria-hidden="true">
                      →
                    </span>
                    <span className="yeargame__actual">{answer}</span>
                  </>
                ) : (
                  <span className="yeargame__guess">{guess}</span>
                )}
              </div>

              <input
                type="range"
                className="yeargame__slider"
                min={MIN_YEAR}
                max={maxYear}
                value={guess}
                disabled={revealed}
                onChange={(event) => setGuess(Number(event.target.value))}
                aria-label="Рік виходу"
              />
              {/* Decade ticks instead of two bare endpoints: the slider is the
                  whole game, so it should read as a timeline. */}
              <div className="yeargame__scale" aria-hidden="true">
                {decades.map((decade) => (
                  <span key={decade} className="yeargame__tick">
                    <i />
                    {decade}
                  </span>
                ))}
              </div>

              {revealed ? (
                <div
                  className={`game-reveal game-reveal--${diff <= 2 ? "correct" : "wrong"}`}
                >
                  <span className="game-reveal__result">
                    {diff === 0
                      ? "В яблучко! +50"
                      : diff <= 2
                        ? `Майже! ±${diff} · +${pointsFor(diff)}`
                        : `Повз на ${diff} р. · +${pointsFor(diff)}`}
                  </span>
                  <button
                    type="button"
                    className="primary game-reveal__next"
                    onClick={nextRound}
                  >
                    {index + 1 >= questions.length ? "Підсумок" : "Далі"}
                  </button>
                </div>
              ) : (
                <button type="button" className="primary yeargame__confirm" onClick={confirm}>
                  Відповісти
                </button>
              )}
            </div>
          </div>
        </GameStage>
      )}

      {status === "finished" && (
        <GameSummary
          title={total >= maxTotal * 0.8 ? "Машина часу! 📅" : "Гру завершено"}
          stats={[{ label: `Очок із ${maxTotal}`, value: total }]}
          shareText={shareText}
          celebrate={maxTotal > 0 && total / maxTotal >= 0.6}
          onReplay={() => void load()}
        />
      )}

    </GameShell>
  );
}

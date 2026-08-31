"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { fetchGameQuestions, type GameQuestion, type GameTitleCard } from "../api/games";
import { GameShell } from "../components/GameShell";
import { GameHud } from "../components/GameHud";
import { GameStage } from "../components/GameStage";
import { GameSummary } from "../components/GameSummary";
import { GameRevealPanel } from "../components/GameRevealPanel";
import { useGameStats } from "../hooks/useGameStats";

const ROUNDS = 5;

type Status = "loading" | "playing" | "finished" | "error";

const yearOf = (card: GameTitleCard) =>
  card.releaseDate ? card.releaseDate.slice(0, 4) : card.year ?? "";

const correctOrder = (items: GameTitleCard[]) =>
  [...items].sort((a, b) => (a.releaseDate ?? "").localeCompare(b.releaseDate ?? ""));

export function TimelineScreen() {
  const router = useRouter();
  const { record } = useGameStats("timeline");

  const [status, setStatus] = useState<Status>("loading");
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [placed, setPlaced] = useState<GameTitleCard[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const recordedRef = useRef(false);

  const load = useCallback(async () => {
    setStatus("loading");
    setIndex(0);
    setPlaced([]);
    setRevealed(false);
    setResults([]);
    recordedRef.current = false;
    try {
      const items = await fetchGameQuestions("timeline", ROUNDS);
      const playable = items.filter((q) => (q.items?.length ?? 0) >= 3);
      if (playable.length === 0) {
        setStatus("error");
        return;
      }
      setQuestions(playable);
      setStatus("playing");
    } catch {
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const question = questions[index] ?? null;
  const pool = (question?.items ?? []).filter(
    (item) => !placed.some((p) => p.tmdbId === item.tmdbId)
  );
  const expected = question ? correctOrder(question.items ?? []) : [];
  const isPerfect =
    revealed && placed.every((item, i) => item.tmdbId === expected[i]?.tmdbId);

  const place = (card: GameTitleCard) => {
    if (revealed) {
      return;
    }
    setPlaced((prev) => [...prev, card]);
  };

  const unplace = (card: GameTitleCard) => {
    if (revealed) {
      return;
    }
    setPlaced((prev) => prev.filter((item) => item.tmdbId !== card.tmdbId));
  };

  const check = () => {
    if (!question || placed.length !== (question.items?.length ?? 0)) {
      return;
    }
    const perfect = placed.every((item, i) => item.tmdbId === expected[i]?.tmdbId);
    setRevealed(true);
    setResults((prev) => [...prev, perfect]);
  };

  const nextRound = () => {
    if (index + 1 >= questions.length) {
      setStatus("finished");
      return;
    }
    setIndex((prev) => prev + 1);
    setPlaced([]);
    setRevealed(false);
  };

  const score = results.filter(Boolean).length;

  useEffect(() => {
    if (status === "finished" && !recordedRef.current) {
      recordedRef.current = true;
      record({ score });
    }
  }, [status, record, score]);

  const shareText = `DropDate · Хронологія\n${score}/${results.length} ${results
    .map((ok) => (ok ? "🟩" : "🟥"))
    .join("")}`;

  return (
    <GameShell playing={status === "playing"}>
      {status === "loading" && (
        <div className="games-loading">
          <span className="games-loading__reel" aria-hidden="true" />
          Гортаємо архіви…
        </div>
      )}

      {status === "error" && (
        <div className="games-error">Не вдалося зібрати гру. Спробуй пізніше.</div>
      )}

      {status === "playing" && question && (
        <GameStage
          roundKey={question.id}
          state={revealed ? (isPerfect ? "correct" : "wrong") : "idle"}
          className="timeline"
        >
          <GameHud
            kicker="Хронологія"
            metrics={[
              { label: "Раунд", value: `${index + 1} / ${questions.length}` },
              { label: "Рахунок", value: `${score}` },
            ]}
            progress={(index + (revealed ? 1 : 0)) / Math.max(1, questions.length)}
          />
          <p className="games-prompt">{question.prompt}</p>

          <div className="timeline__slots">
            {(question.items ?? []).map((_, slotIndex) => {
              const card = placed[slotIndex];
              const good = revealed && card && card.tmdbId === expected[slotIndex]?.tmdbId;
              return (
                <div
                  key={slotIndex}
                  className={`timeline__slot${card ? " is-filled" : ""}${
                    revealed ? (good ? " is-correct" : " is-wrong") : ""
                  }`}
                >
                  <span className="timeline__slot-index">{slotIndex + 1}</span>
                  {card ? (
                    <button
                      type="button"
                      className="timeline__card"
                      onClick={() => unplace(card)}
                      disabled={revealed}
                    >
                      {card.posterUrl ? (
                        <span className="timeline__poster">
                          <CoverImage src={card.posterUrl} alt={card.title} sizes="120px" />
                        </span>
                      ) : null}
                      <span className="timeline__card-title">{card.title}</span>
                      {revealed ? (
                        <span className="timeline__year">{yearOf(card)}</span>
                      ) : null}
                    </button>
                  ) : (
                    <span className="timeline__placeholder">?</span>
                  )}
                </div>
              );
            })}
          </div>

          {revealed && !isPerfect ? (
            <p className="timeline__truth">
              Правильно:{" "}
              {expected.map((item, i) => (
                <span key={item.tmdbId}>
                  {i > 0 ? " → " : ""}
                  {item.title} ({yearOf(item)})
                </span>
              ))}
            </p>
          ) : null}

          {!revealed ? (
            <>
              <p className="timeline__hint">
                Тисни на фільми в порядку виходу — від найстарішого до найновішого.
                Тап по вибраній картці повертає її назад.
              </p>
              <div className="timeline__pool">
                {pool.map((card) => (
                  <button
                    key={card.tmdbId}
                    type="button"
                    className="timeline__card timeline__card--pool"
                    onClick={() => place(card)}
                  >
                    {card.posterUrl ? (
                      <span className="timeline__poster">
                        <CoverImage src={card.posterUrl} alt={card.title} sizes="150px" />
                      </span>
                    ) : null}
                    <span className="timeline__card-title">{card.title}</span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="primary timeline__check"
                disabled={placed.length !== (question.items?.length ?? 0)}
                onClick={check}
              >
                Перевірити
              </button>
            </>
          ) : (
            <GameRevealPanel
              isCorrect={isPerfect}
              isLast={index + 1 >= questions.length}
              onNext={nextRound}
            />
          )}
        </GameStage>
      )}

      {status === "finished" && (
        <GameSummary
          title={score === results.length ? "Ходяча енциклопедія! 🕰️" : "Гру завершено"}
          stats={[{ label: "Ідеальних раундів", value: `${score} / ${results.length}` }]}
          squares={results}
          shareText={shareText}
          celebrate={results.length > 0 && score / results.length >= 0.6}
          onReplay={() => void load()}
        />
      )}

    </GameShell>
  );
}

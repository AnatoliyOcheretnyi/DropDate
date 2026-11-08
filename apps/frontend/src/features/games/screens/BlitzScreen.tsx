"use client";
import { MovieInfoButton } from "../../../shared/ui/MovieInfoButton";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { fetchGameQuestions, type GameQuestion } from "../api/games";
import { GameShell } from "../components/GameShell";
import { GameHud } from "../components/GameHud";
import { GameStage } from "../components/GameStage";
import { gameTitles } from "../gameTitles";
import { GameSummary } from "../components/GameSummary";
import { GameCountdown } from "../components/GameCountdown";
import { useGameStats } from "../hooks/useGameStats";

const ROUNDS = 10;
const ROUND_MS = 12000;
const TICK_MS = 100;

type Status = "setup" | "loading" | "countdown" | "playing" | "finished" | "error";

const squares = (results: boolean[]) =>
  results.map((ok) => (ok ? "🟩" : "🟥")).join("");

export function BlitzScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const daily = searchParams.get("daily") === "1";
  const relaxed = !daily && searchParams.get("tempo") === "relaxed";
  const needsSetup = !daily && !["relaxed", "timed"].includes(searchParams.get("tempo") ?? "");
  const { record } = useGameStats(relaxed ? "blitz_relaxed" : "blitz");

  const [status, setStatus] = useState<Status>("setup");
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
      // The clock starts with the round, so the first frame gets a 3-2-1
      // instead of eating a second while the player reads the options.
      setStatus(relaxed ? "playing" : "countdown");
    } catch {
      setStatus("error");
    }
  }, [daily, relaxed]);

  useEffect(() => {
    if (needsSetup) { setStatus("setup"); return; }
    void load();
  }, [load, needsSetup]);

  const question = questions[index] ?? null;

  const reveal = useCallback(
    (tmdbId: number | null) => {
      if (revealed) return;
      setPicked(tmdbId);
      setRevealed(true);
      setResults((prev) => [...prev, tmdbId !== null && tmdbId === question?.answerId]);
    },
    [question, revealed]
  );

  // Round countdown; running out counts as a miss.
  useEffect(() => {
    if (status !== "playing" || revealed || relaxed) {
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
  }, [status, revealed, index, reveal, relaxed]);

  const nextRound = () => {
    if (index + 1 >= questions.length) setStatus("finished");
    else { setIndex(prev => prev + 1); setPicked(null); setRevealed(false); }
  };

  const score = results.filter(Boolean).length;

  useEffect(() => {
    if (status === "finished" && !recordedRef.current) {
      recordedRef.current = true;
      record({ score });
    }
  }, [status, record, score]);

  const shareText = `DropDate · Вгадай за кадром${daily ? ` · ${new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long" }).format(new Date())}` : ""}\n${score}/${results.length} ${squares(results)}`;

  return (
    <GameShell playing={status === "playing"}>
      {status === "setup" && <section className="games-setup">
        <p className="eyebrow">Вгадай за кадром</p><h1>У своєму темпі</h1><p>10 кадрів. Після відповіді можна роздивитися фільм і зберегти його.</p>
        <div className="games-setup__modes">
          <button type="button" onClick={() => router.push("/games/blitz?tempo=relaxed")}><strong>Без поспіху</strong><small>Без таймера. Стільки часу, скільки потрібно.</small><b>Почати →</b></button>
          <button type="button" onClick={() => router.push("/games/blitz?tempo=timed")}><strong>Бліц</strong><small>12 секунд на кожну відповідь.</small><b>Почати →</b></button>
        </div>
      </section>}
      {status === "loading" && (
        <div className="games-loading">
          <span className="games-loading__reel" aria-hidden="true" />
          Нарізаємо кадри…
        </div>
      )}

      {status === "countdown" && (
        <GameCountdown onDone={() => setStatus("playing")} label="Дивись уважно" />
      )}

      {status === "error" && (
        <div className="games-error">Не вдалося зібрати гру. Спробуй пізніше.</div>
      )}

      {status === "playing" && question && question.card && (
        <GameStage roundKey={question.id} className="blitz">
          <GameHud
            kicker={daily ? "Щоденний виклик · Вгадай за кадром" : "Вгадай за кадром"}
            mode={relaxed ? "rounds" : "timed"}
            metrics={[
              { label: "Кадр", value: `${index + 1} / ${questions.length}` },
              { label: "Рахунок", value: `${score}` },
            ]}
            timeRatio={relaxed ? undefined : timeLeft / ROUND_MS}
            timeLabel={relaxed ? undefined : `${Math.ceil(timeLeft / 1000)}с`}
          />

          <div className={`blitz__frame${revealed ? " is-revealed" : ""}`}>
            {revealed ? <MovieInfoButton tmdbId={question.card.tmdbId} mediaType={question.card.mediaType} title={question.card.title} /> : null}
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
          {revealed ? <div className="game-reveal"><span>{picked === question.answerId ? "Правильно!" : `Це «${question.card.title}»`}</span><button type="button" className="primary" onClick={nextRound}>{index + 1 >= questions.length ? "Підсумок" : "Далі"}</button></div> : null}
        </GameStage>
      )}

      {status === "finished" && (
        <GameSummary
          titles={gameTitles(questions)}
          title={score >= 8 ? "Кіноман! 🎬" : "Гру завершено"}
          stats={[{ label: "Вгадано кадрів", value: `${score} / ${results.length}` }]}
          squares={results}
          shareText={shareText}
          celebrate={results.length > 0 && score / results.length >= 0.7}
          onReplay={() => void load()}
        />
      )}

    </GameShell>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { GameShell } from "../components/GameShell";
import { GameHud } from "../components/GameHud";
import { GameStage } from "../components/GameStage";
import { GameSummary } from "../components/GameSummary";
import { GameRevealPanel } from "../components/GameRevealPanel";
import { useGameStats } from "../hooks/useGameStats";
import { fetchGameQuestions, type GameMode, type GameQuestion } from "../api/games";

const MODES: Array<{ id: GameMode; label: string; hint: string; emoji: string }> = [
  {
    id: "movie_actor",
    label: "Актор у фільмі",
    hint: "Показуємо фільм — обери, хто в ньому знімався",
    emoji: "🎬",
  },
  {
    id: "actor_movie",
    label: "Фільм актора",
    hint: "Показуємо актора — обери його фільм",
    emoji: "🧑‍🎤",
  },
  {
    id: "movie_director",
    label: "Режисер фільму",
    hint: "Показуємо фільм — обери, хто його зняв",
    emoji: "🎥",
  },
  {
    id: "director_movie",
    label: "Фільм режисера",
    hint: "Показуємо режисера — обери його роботу",
    emoji: "🎞️",
  },
];

const ROUNDS = 10;

type Status = "idle" | "loading" | "playing" | "finished" | "error";

export function PeopleGameScreen() {
  const router = useRouter();
  const params = useSearchParams();
  const modeParam = params.get("mode");
  const mode = MODES.some((item) => item.id === modeParam)
    ? (modeParam as GameMode)
    : null;
  const { record } = useGameStats("people");

  const [status, setStatus] = useState<Status>("idle");
  const [questions, setQuestions] = useState<GameQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);

  const load = useCallback(async () => {
    if (!mode) {
      return;
    }
    setStatus("loading");
    setIndex(0);
    setSelected(null);
    setResults([]);
    try {
      const items = await fetchGameQuestions(mode, ROUNDS);
      if (items.length === 0) {
        setStatus("error");
        return;
      }
      setQuestions(items);
      setStatus("playing");
    } catch {
      setStatus("error");
    }
  }, [mode]);

  useEffect(() => {
    if (!mode) {
      setStatus("idle");
      return;
    }
    void load();
  }, [load, mode]);

  const question = questions[index] ?? null;
  const score = results.filter(Boolean).length;

  useEffect(() => {
    if (status === "finished") {
      record({ score });
    }
    // Recording once per finished round is the point; score is stable by then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const answer = (id: number) => {
    if (selected !== null || !question) {
      return;
    }
    setSelected(id);
    setResults((prev) => [...prev, id === question.answerId]);
  };

  const next = () => {
    if (index + 1 >= questions.length) {
      setStatus("finished");
      return;
    }
    setSelected(null);
    setIndex((value) => value + 1);
  };

  const optionState = (id: number) => {
    if (selected === null || !question) {
      return "";
    }
    if (id === question.answerId) {
      return " is-correct";
    }
    if (id === selected) {
      return " is-wrong";
    }
    return " is-muted";
  };

  if (!mode) {
    return (
      <GameShell>
        <div className="games-head games-head--tight">
          <p className="eyebrow">Люди кіно</p>
          <h1>Хто знімав і хто знімався?</h1>
          <p className="games-lead">
            Тренуй зв’язки між акторами, режисерами та їхніми фільмами.
          </p>
        </div>
        <div className="people-game-modes">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              className="people-game-mode"
              onClick={() => router.push(`/games/people?mode=${item.id}`)}
            >
              <span className="people-game-mode__emoji" aria-hidden="true">
                {item.emoji}
              </span>
              <strong>{item.label}</strong>
              <span className="people-game-mode__hint">{item.hint}</span>
              <span className="people-game-mode__cta">Грати →</span>
            </button>
          ))}
        </div>
      </GameShell>
    );
  }

  if (status === "loading") {
    return (
      <GameShell>
        <div className="games-loading">
          <span className="games-loading__reel" aria-hidden="true" />
          Готуємо кінозв’язки…
        </div>
      </GameShell>
    );
  }

  if (status === "error") {
    return (
      <GameShell>
        <div className="games-error">
          Не вдалося зібрати гру.{" "}
          <button type="button" className="taste-link" onClick={() => void load()}>
            Спробувати ще
          </button>
        </div>
      </GameShell>
    );
  }

  if (status === "finished") {
    return (
      <GameShell>
        <GameSummary
          title={score >= 8 ? "Знавець облич! 🎭" : "Раунд завершено"}
          stats={[{ label: "Правильних", value: `${score} / ${results.length}` }]}
          squares={results}
          shareText={`DropDate · Люди кіно\n${score}/${results.length}`}
          celebrate={results.length > 0 && score / results.length >= 0.7}
          onReplay={() => void load()}
          extra={
            <button
              type="button"
              className="people-game__switch"
              onClick={() => router.push("/games/people")}
            >
              Інший режим →
            </button>
          }
        />
      </GameShell>
    );
  }

  if (!question) {
    return null;
  }

  const modeLabel = MODES.find((item) => item.id === mode)?.label ?? "Люди кіно";

  return (
    <GameShell playing>
      <GameStage
        roundKey={question.id}
        state={
          selected === null ? "idle" : selected === question.answerId ? "correct" : "wrong"
        }
        className="people-game"
      >
        <GameHud
          kicker={`Люди кіно · ${modeLabel}`}
          metrics={[
            { label: "Питання", value: `${index + 1} / ${questions.length}` },
            { label: "Рахунок", value: `${score}` },
          ]}
          progress={(index + (selected !== null ? 1 : 0)) / Math.max(1, questions.length)}
        />

        <p className="games-prompt">{question.prompt}</p>

        {question.card ? (
          <div className="people-game__subject">
            <span className="people-game__subject-media">
              {question.card.posterUrl ? (
                <CoverImage src={question.card.posterUrl} alt={question.card.title} sizes="150px" />
              ) : (
                <span aria-hidden="true">{question.card.title.slice(0, 1)}</span>
              )}
            </span>
            <div>
              <strong>{question.card.title}</strong>
              <span>{question.card.year}</span>
            </div>
          </div>
        ) : null}

        {question.person ? (
          <div className="people-game__subject is-person">
            <span className="people-game__subject-media">
              {question.person.profileUrl ? (
                <CoverImage src={question.person.profileUrl} alt={question.person.name} sizes="150px" />
              ) : (
                <span aria-hidden="true">{question.person.name.slice(0, 1)}</span>
              )}
            </span>
            <div>
              <strong>{question.person.name}</strong>
              <span>{question.person.role}</span>
            </div>
          </div>
        ) : null}

        <div className="people-game__options">
          {question.people?.map((person) => (
            <button
              key={person.tmdbId}
              type="button"
              className={`people-game__option${optionState(person.tmdbId)}`}
              disabled={selected !== null}
              onClick={() => answer(person.tmdbId)}
            >
              <span className="people-game__option-media">
                {person.profileUrl ? (
                  <CoverImage src={person.profileUrl} alt={person.name} sizes="96px" />
                ) : (
                  <span aria-hidden="true">{person.name.slice(0, 1)}</span>
                )}
              </span>
              <strong>{person.name}</strong>
            </button>
          ))}

          {question.options?.map((movie) => (
            <button
              key={movie.tmdbId}
              type="button"
              className={`people-game__option${optionState(movie.tmdbId)}`}
              disabled={selected !== null}
              onClick={() => answer(movie.tmdbId)}
            >
              <span className="people-game__option-media is-poster">
                {movie.posterUrl ? (
                  <CoverImage src={movie.posterUrl} alt={movie.title} sizes="96px" />
                ) : (
                  <span aria-hidden="true">{movie.title.slice(0, 1)}</span>
                )}
              </span>
              <strong>{movie.title}</strong>
            </button>
          ))}
        </div>

        {selected !== null ? (
          <GameRevealPanel
            isCorrect={selected === question.answerId}
            isLast={index + 1 >= questions.length}
            onNext={next}
          />
        ) : null}
      </GameStage>
    </GameShell>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchGameQuestions,
  type GameMode,
  type GameQuestion,
} from "../api/games";

const DEFAULT_COUNT = 10;
const SURVIVAL_LIVES = 3;
const ENDLESS_BATCH = 15;
// Refill the endless queue when this few unanswered questions remain.
const ENDLESS_LOW_WATER = 4;

type SessionStatus = "idle" | "loading" | "playing" | "finished" | "error";

type Side = "left" | "right";

type StartOptions = {
  count?: number;
  /** Three lives, unlimited questions, batches refilled on the fly. */
  endless?: boolean;
  /** Deterministic daily set — same questions for every player. */
  daily?: boolean;
  seed?: string;
};

type SessionState = {
  status: SessionStatus;
  mode: GameMode | null;
  questions: GameQuestion[];
  index: number;
  selected: Side | null;
  score: number;
  streak: number;
  bestStreak: number;
  lives: number;
  maxLives: number;
  endless: boolean;
  daily: boolean;
};

const initialState: SessionState = {
  status: "idle",
  mode: null,
  questions: [],
  index: 0,
  selected: null,
  score: 0,
  streak: 0,
  bestStreak: 0,
  lives: 0,
  maxLives: 0,
  endless: false,
  daily: false,
};

const pairKey = (q: GameQuestion) =>
  [q.left?.tmdbId ?? 0, q.right?.tmdbId ?? 0].sort((a, b) => a - b).join("-");

/**
 * useGameSession owns the pair-battle state: current question, selected
 * answer, reveal, score, streak and lives. Survival mode plays with three lives
 * and keeps appending fresh (deduplicated) batches as the queue runs low.
 */
export function useGameSession() {
  const [state, setState] = useState<SessionState>(initialState);
  const requestRef = useRef<AbortController | null>(null);
  const refillingRef = useRef(false);

  const start = useCallback(async (mode: GameMode, options: StartOptions = {}) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;

    const endless = Boolean(options.endless);
    const daily = Boolean(options.daily);
    const lives = endless ? SURVIVAL_LIVES : 0;
    const count = endless ? ENDLESS_BATCH : options.count ?? DEFAULT_COUNT;

    setState({
      ...initialState,
      status: "loading",
      mode,
      endless,
      daily,
      lives,
      maxLives: lives,
    });
    try {
      const questions = await fetchGameQuestions(mode, count, {
        signal: controller.signal,
        daily,
        seed: options.seed,
      });
      if (controller.signal.aborted) {
        return;
      }
      if (questions.length === 0) {
        setState((prev) => ({ ...prev, status: "error" }));
        return;
      }
      setState((prev) => ({ ...prev, status: "playing", questions }));
    } catch {
      if (!controller.signal.aborted) {
        setState((prev) => ({ ...prev, status: "error" }));
      }
    }
  }, []);

  // Endless mode: top up the queue in the background before it drains.
  const remaining = state.questions.length - state.index;
  useEffect(() => {
    if (
      !state.endless ||
      state.status !== "playing" ||
      remaining > ENDLESS_LOW_WATER ||
      refillingRef.current ||
      !state.mode
    ) {
      return;
    }
    refillingRef.current = true;
    const mode = state.mode;
    void fetchGameQuestions(mode, ENDLESS_BATCH)
      .then((batch) => {
        setState((prev) => {
          if (prev.status !== "playing" || prev.mode !== mode) {
            return prev;
          }
          const seen = new Set(prev.questions.map(pairKey));
          const fresh = batch.filter((q) => !seen.has(pairKey(q)));
          if (fresh.length === 0) {
            return prev;
          }
          return { ...prev, questions: [...prev.questions, ...fresh] };
        });
      })
      .catch(() => undefined)
      .finally(() => {
        refillingRef.current = false;
      });
  }, [state.endless, state.status, state.mode, remaining]);

  const selectAnswer = useCallback((side: Side) => {
    setState((prev) => {
      if (prev.status !== "playing" || prev.selected !== null) {
        return prev;
      }
      const question = prev.questions[prev.index];
      if (!question) {
        return prev;
      }
      const correct = side === question.answer;
      const streak = correct ? prev.streak + 1 : 0;
      return {
        ...prev,
        selected: side,
        score: correct ? prev.score + 1 : prev.score,
        streak,
        bestStreak: Math.max(prev.bestStreak, streak),
        lives: correct || !prev.endless ? prev.lives : prev.lives - 1,
      };
    });
  }, []);

  const next = useCallback(() => {
    setState((prev) => {
      if (prev.selected === null) {
        return prev;
      }
      const nextIndex = prev.index + 1;
      if ((prev.endless && prev.lives <= 0) || nextIndex >= prev.questions.length) {
        return { ...prev, status: "finished" };
      }
      return { ...prev, index: nextIndex, selected: null };
    });
  }, []);

  const reset = useCallback(() => {
    requestRef.current?.abort();
    setState(initialState);
  }, []);

  const current = state.questions[state.index] ?? null;
  const isRevealed = state.selected !== null;

  return {
    status: state.status,
    mode: state.mode,
    question: current,
    questionNumber: state.index + 1,
    totalQuestions: state.questions.length,
    selected: state.selected,
    isRevealed,
    score: state.score,
    streak: state.streak,
    bestStreak: state.bestStreak,
    lives: state.lives,
    maxLives: state.maxLives,
    isOutOfLives: state.endless && state.lives <= 0,
    isEndless: state.endless,
    isDaily: state.daily,
    start,
    selectAnswer,
    next,
    reset,
  };
}

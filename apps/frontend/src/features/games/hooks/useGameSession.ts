"use client";

import { useCallback, useRef, useState } from "react";
import {
  fetchGameQuestions,
  type GameMode,
  type GameQuestion,
} from "../api/games";

const DEFAULT_COUNT = 10;
const STARTING_LIVES = 3;

type SessionStatus = "idle" | "loading" | "playing" | "finished" | "error";

type Side = "left" | "right";

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
  lives: STARTING_LIVES,
};

/**
 * useGameSession owns the lightweight single-player game state described in the
 * spec: current question, selected answer, reveal, score and streak. It does
 * not require a global store.
 */
export function useGameSession() {
  const [state, setState] = useState<SessionState>(initialState);
  const requestRef = useRef<AbortController | null>(null);

  const start = useCallback(
    async (mode: GameMode, count: number = DEFAULT_COUNT) => {
      requestRef.current?.abort();
      const controller = new AbortController();
      requestRef.current = controller;

      setState({ ...initialState, status: "loading", mode });
      try {
        const questions = await fetchGameQuestions(mode, count, controller.signal);
        if (controller.signal.aborted) {
          return;
        }
        if (questions.length === 0) {
          setState({ ...initialState, status: "error", mode });
          return;
        }
        setState({ ...initialState, status: "playing", mode, questions });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }
        setState({ ...initialState, status: "error", mode });
      }
    },
    []
  );

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
        lives: correct ? prev.lives : prev.lives - 1,
      };
    });
  }, []);

  const next = useCallback(() => {
    setState((prev) => {
      if (prev.selected === null) {
        return prev;
      }
      const nextIndex = prev.index + 1;
      // End the run when lives are gone or all questions are answered.
      if (prev.lives <= 0 || nextIndex >= prev.questions.length) {
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
    maxLives: STARTING_LIVES,
    isOutOfLives: state.lives <= 0,
    start,
    selectAnswer,
    next,
    reset,
  };
}

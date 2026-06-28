"use client";

import { useCallback, useRef, useState } from "react";
import {
  fetchMoodPicks,
  fetchMoodQuestions,
  type MoodPick,
  type MoodQuestion,
} from "../api/mood";

export type MoodStatus =
  | "config"
  | "asking"
  | "loading"
  | "results"
  | "empty"
  | "error";

const DEFAULT_COUNT = 6;

export function useMoodSession(accessToken?: string | null) {
  const [status, setStatus] = useState<MoodStatus>("config");
  const [depth, setDepth] = useState("standard");
  const [questions, setQuestions] = useState<MoodQuestion[]>([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [picks, setPicks] = useState<MoodPick[]>([]);
  const [relaxed, setRelaxed] = useState<string[]>([]);

  const answersRef = useRef<Record<string, string>>({});
  const depthRef = useRef("standard");
  const shownRef = useRef<Set<number>>(new Set());

  const submit = useCallback(
    async (finalAnswers: Record<string, string>, isMore = false) => {
      setStatus("loading");
      try {
        const result = await fetchMoodPicks(
          {
            depth: depthRef.current,
            answers: finalAnswers,
            count: DEFAULT_COUNT,
            excludeTmdbIds: Array.from(shownRef.current),
          },
          accessToken
        );
        setRelaxed(result.meta?.relaxed ?? []);
        if (result.items.length === 0) {
          if (isMore) {
            setStatus("results"); // keep the existing picks
            return;
          }
          setPicks([]);
          setStatus("empty");
          return;
        }
        result.items.forEach((pick) => shownRef.current.add(pick.tmdbId));
        setPicks(result.items);
        setStatus("results");
      } catch {
        setStatus("error");
      }
    },
    [accessToken]
  );

  const start = useCallback(async (chosenDepth: string) => {
    setDepth(chosenDepth);
    depthRef.current = chosenDepth;
    setStatus("loading");
    try {
      const items = await fetchMoodQuestions(chosenDepth);
      if (items.length === 0) {
        setStatus("error");
        return;
      }
      setQuestions(items);
      setStepIndex(0);
      setAnswers({});
      answersRef.current = {};
      shownRef.current = new Set();
      setStatus("asking");
    } catch {
      setStatus("error");
    }
  }, []);

  const answer = useCallback(
    (optionId: string) => {
      const question = questions[stepIndex];
      if (!question) {
        return;
      }
      const nextAnswers = { ...answersRef.current, [question.id]: optionId };
      answersRef.current = nextAnswers;
      setAnswers(nextAnswers);
      if (stepIndex >= questions.length - 1) {
        void submit(nextAnswers);
      } else {
        setStepIndex((index) => index + 1);
      }
    },
    [questions, stepIndex, submit]
  );

  const back = useCallback(() => {
    setStepIndex((index) => Math.max(0, index - 1));
  }, []);

  const showMore = useCallback(() => {
    void submit(answersRef.current, true);
  }, [submit]);

  const reset = useCallback(() => {
    setStatus("config");
    setQuestions([]);
    setStepIndex(0);
    setAnswers({});
    answersRef.current = {};
    setPicks([]);
    setRelaxed([]);
    shownRef.current = new Set();
  }, []);

  return {
    status,
    depth,
    questions,
    current: questions[stepIndex],
    stepIndex,
    total: questions.length,
    answers,
    picks,
    relaxed,
    start,
    answer,
    back,
    showMore,
    reset,
  };
}

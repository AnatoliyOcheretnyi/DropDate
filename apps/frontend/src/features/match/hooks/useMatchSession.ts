"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  fetchMatchPicks,
  fetchMatchQuestions,
  pickKey,
  type MatchPick,
  type MatchQuestion,
} from "../api/match";

export type MatchStatus = "config" | "asking" | "loading" | "results" | "error";

const COUNT = 6;
// Both the movie and tv flows are exactly this many steps.
const TOTAL = 10;

export function useMatchSession(accessToken?: string | null) {
  const [status, setStatus] = useState<MatchStatus>("config");
  const [questions, setQuestions] = useState<MatchQuestion[]>([]);
  const [media, setMedia] = useState<string>("");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [picks, setPicks] = useState<MatchPick[]>([]);

  const answersRef = useRef<Record<string, string>>({});
  const shownRef = useRef<Set<string>>(new Set());

  // The active step sequence: just the media question until it's answered, then
  // the media question plus every step that applies to the chosen type.
  const flow = useMemo(() => {
    if (!media) {
      return questions.filter((q) => q.id === "media");
    }
    return questions.filter((q) => q.appliesTo === "both" || q.appliesTo === media);
  }, [questions, media]);

  const fetchBatch = useCallback(async () => {
    setStatus("loading");
    try {
      const items = await fetchMatchPicks(
        {
          answers: answersRef.current,
          count: COUNT,
          excludeKeys: Array.from(shownRef.current),
        },
        accessToken
      );
      items.forEach((pick) => shownRef.current.add(pickKey(pick)));
      if (items.length > 0) {
        setPicks(items);
      }
      setStatus("results");
    } catch {
      setStatus("error");
    }
  }, [accessToken]);

  const start = useCallback(async () => {
    setStatus("loading");
    try {
      const items = await fetchMatchQuestions();
      if (items.length === 0) {
        setStatus("error");
        return;
      }
      setQuestions(items);
      setMedia("");
      setIndex(0);
      setAnswers({});
      answersRef.current = {};
      shownRef.current = new Set();
      setPicks([]);
      setStatus("asking");
    } catch {
      setStatus("error");
    }
  }, []);

  const answer = useCallback(
    (optionId: string) => {
      const question = flow[index];
      if (!question) {
        return;
      }
      const next = { ...answersRef.current, [question.id]: optionId };
      answersRef.current = next;
      setAnswers(next);
      if (question.id === "media") {
        setMedia(optionId);
      }
      setIndex(index + 1);
      void fetchBatch();
    },
    [flow, index, fetchBatch]
  );

  const refine = useCallback(() => {
    if (index < flow.length) {
      setStatus("asking");
    }
  }, [index, flow.length]);

  const more = useCallback(() => {
    void fetchBatch();
  }, [fetchBatch]);

  const reset = useCallback(() => {
    setStatus("config");
    setQuestions([]);
    setMedia("");
    setIndex(0);
    setAnswers({});
    answersRef.current = {};
    shownRef.current = new Set();
    setPicks([]);
  }, []);

  return {
    status,
    current: flow[index],
    index,
    total: TOTAL,
    answers,
    picks,
    canRefine: index < flow.length,
    start,
    answer,
    refine,
    more,
    reset,
  };
}

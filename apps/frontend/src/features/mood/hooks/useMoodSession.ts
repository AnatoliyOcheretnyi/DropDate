"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  fetchMoodNext,
  fetchMoodPicks,
  type MoodPick,
  type MoodQuestion,
} from "../api/mood";

// Persist the session so navigating to a title's details and back restores the
// flow (soft back) instead of resetting it.
const STORAGE_KEY = "dropdate:mood-session";

export type MoodStatus =
  | "config"
  | "asking"
  | "loading"
  | "results"
  | "empty"
  | "error";

const DEFAULT_COUNT = 6;

// Soft total for the progress indicator. The adaptive flow's length isn't known
// up front, so we estimate by depth and never let it fall below the real step.
// Both paths include the mood sub-branch and the thematic step.
const ESTIMATED_TOTAL: Record<string, number> = { quick: 6, standard: 8 };

export function useMoodSession(accessToken?: string | null) {
  const [status, setStatus] = useState<MoodStatus>("config");
  const [depth, setDepth] = useState("standard");
  const [current, setCurrent] = useState<MoodQuestion | undefined>(undefined);
  const [history, setHistory] = useState<MoodQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [picks, setPicks] = useState<MoodPick[]>([]);
  const [relaxed, setRelaxed] = useState<string[]>([]);

  const answersRef = useRef<Record<string, string>>({});
  const depthRef = useRef("standard");
  const shownRef = useRef<Set<number>>(new Set());

  // Restore a resumable session on mount (soft back from details).
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }
      const snap = JSON.parse(raw) as {
        status?: MoodStatus;
        depth?: string;
        current?: MoodQuestion;
        history?: MoodQuestion[];
        answers?: Record<string, string>;
        picks?: MoodPick[];
        relaxed?: string[];
      };
      if (snap.status !== "asking" && snap.status !== "results") {
        return;
      }
      setStatus(snap.status);
      setDepth(snap.depth ?? "standard");
      depthRef.current = snap.depth ?? "standard";
      setCurrent(snap.current);
      setHistory(Array.isArray(snap.history) ? snap.history : []);
      setAnswers(snap.answers ?? {});
      answersRef.current = snap.answers ?? {};
      setPicks(Array.isArray(snap.picks) ? snap.picks : []);
      setRelaxed(Array.isArray(snap.relaxed) ? snap.relaxed : []);
      shownRef.current = new Set((snap.picks ?? []).map((p) => p.tmdbId));
    } catch {
      // ignore malformed storage
    }
  }, []);

  // Persist resumable states; clear once the flow is reset to config.
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (status !== "asking" && status !== "results") {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    try {
      window.sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ status, depth, current, history, answers, picks, relaxed })
      );
    } catch {
      // ignore quota/serialization errors
    }
  }, [status, depth, current, history, answers, picks, relaxed]);

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

  // advance fetches the next adaptive question; when the flow is done it resolves
  // the answers into picks.
  const advance = useCallback(
    async (nextAnswers: Record<string, string>) => {
      setStatus("loading");
      try {
        const res = await fetchMoodNext(
          depthRef.current,
          nextAnswers,
          accessToken
        );
        if (res.done || !res.question) {
          await submit(nextAnswers);
          return;
        }
        setCurrent(res.question);
        setStatus("asking");
      } catch {
        setStatus("error");
      }
    },
    [accessToken, submit]
  );

  const start = useCallback(
    async (chosenDepth: string) => {
      setDepth(chosenDepth);
      depthRef.current = chosenDepth;
      setStatus("loading");
      setHistory([]);
      setAnswers({});
      answersRef.current = {};
      setCurrent(undefined);
      shownRef.current = new Set();
      try {
        const res = await fetchMoodNext(chosenDepth, {}, accessToken);
        if (res.done || !res.question) {
          setStatus("error");
          return;
        }
        setCurrent(res.question);
        setStatus("asking");
      } catch {
        setStatus("error");
      }
    },
    [accessToken]
  );

  const answer = useCallback(
    (optionId: string) => {
      setCurrent((question) => {
        if (!question) {
          return question;
        }
        const nextAnswers = { ...answersRef.current, [question.id]: optionId };
        answersRef.current = nextAnswers;
        setAnswers(nextAnswers);
        setHistory((prev) => [...prev, question]);
        void advance(nextAnswers);
        return question;
      });
    },
    [advance]
  );

  const back = useCallback(() => {
    setHistory((prev) => {
      if (prev.length === 0) {
        return prev;
      }
      const previous = prev[prev.length - 1];
      const nextAnswers = { ...answersRef.current };
      delete nextAnswers[previous.id];
      answersRef.current = nextAnswers;
      setAnswers(nextAnswers);
      setCurrent(previous);
      setStatus("asking");
      return prev.slice(0, -1);
    });
  }, []);

  const showMore = useCallback(() => {
    void submit(answersRef.current, true);
  }, [submit]);

  const dismissPick = useCallback(
    (tmdbId: number) => {
      setPicks((currentPicks) => currentPicks.filter((pick) => pick.tmdbId !== tmdbId));
      void submit(answersRef.current, true);
    },
    [submit]
  );
  const likePick = useCallback(async (pick: MoodPick) => {
    setStatus("loading");
    try { const response=await fetch(`/api/recommendations/similar?tmdbId=${pick.tmdbId}&mediaType=${pick.mediaType}`);const payload=await response.json();const next=(payload.items??[]).map((item:{id:number;mediaType:"movie"|"tv";title:string;year?:string;posterUrl?:string})=>({tmdbId:item.id,mediaType:item.mediaType,title:item.title,year:item.year,posterUrl:item.posterUrl,reason:`Схоже на «${pick.title}»`}));setPicks([pick,...next].slice(0,DEFAULT_COUNT));setStatus("results"); } catch { setStatus("results"); }
  }, []);

  const reset = useCallback(() => {
    setStatus("config");
    setCurrent(undefined);
    setHistory([]);
    setAnswers({});
    answersRef.current = {};
    setPicks([]);
    setRelaxed([]);
    shownRef.current = new Set();
  }, []);

  const total = Math.max(ESTIMATED_TOTAL[depth] ?? 6, history.length + 1);

  return {
    status,
    depth,
    current,
    stepIndex: history.length,
    total,
    answers,
    picks,
    relaxed,
    start,
    answer,
    back,
    showMore,
    dismissPick,
    likePick,
    reset,
  };
}

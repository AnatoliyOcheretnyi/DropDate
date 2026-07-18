"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
const STORAGE_KEY = "dropdate:match-session";

export function useMatchSession(accessToken?: string | null) {
  const [status, setStatus] = useState<MatchStatus>("config");
  const [questions, setQuestions] = useState<MatchQuestion[]>([]);
  const [media, setMedia] = useState<string>("");
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [picks, setPicks] = useState<MatchPick[]>([]);

  const answersRef = useRef<Record<string, string>>({});
  const shownRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const snapshot = JSON.parse(raw) as {
        status?: MatchStatus; questions?: MatchQuestion[]; media?: string; index?: number;
        answers?: Record<string, string>; picks?: MatchPick[]; shown?: string[];
      };
      if (snapshot.status !== "asking" && snapshot.status !== "results") return;
      setStatus(snapshot.status);
      setQuestions(snapshot.questions ?? []);
      setMedia(snapshot.media ?? "");
      setIndex(snapshot.index ?? 0);
      setAnswers(snapshot.answers ?? {});
      answersRef.current = snapshot.answers ?? {};
      setPicks(snapshot.picks ?? []);
      shownRef.current = new Set(snapshot.shown ?? []);
    } catch {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (status !== "asking" && status !== "results") {
      window.sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      status, questions, media, index, answers, picks, shown: Array.from(shownRef.current),
    }));
  }, [status, questions, media, index, answers, picks]);

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

  const dismissPick = useCallback((pick: MatchPick) => {
    shownRef.current.add(pickKey(pick));
    setPicks((current) => current.filter((item) => pickKey(item) !== pickKey(pick)));
    void fetchBatch();
  }, [fetchBatch]);
  const likePick = useCallback(async (pick: MatchPick) => { setStatus("loading");try{const response=await fetch(`/api/recommendations/similar?tmdbId=${pick.tmdbId}&mediaType=${pick.mediaType}`);const payload=await response.json();const next=(payload.items??[]).map((item:{id:number;mediaType:"movie"|"tv";title:string;year?:string;posterUrl?:string})=>({tmdbId:item.id,mediaType:item.mediaType,title:item.title,year:item.year,posterUrl:item.posterUrl}));setPicks([pick,...next].slice(0,COUNT));setStatus("results")}catch{setStatus("results")}},[]);

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
    dismissPick,
    likePick,
    reset,
  };
}

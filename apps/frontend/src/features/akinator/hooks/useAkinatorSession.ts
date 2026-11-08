"use client";

import { useEffect, useRef, useState } from "react";
import { logAkinatorResult, nextAkinator, startAkinator, type AkinatorAnswer, type AkinatorAnswerItem, type AkinatorStep } from "../api/akinator";

type Snapshot = { current: AkinatorStep; answers: AkinatorAnswerItem[]; rejected: number[] };

export function useAkinatorSession() {
  const [sessionToken, setSessionToken] = useState("");
  const [answers, setAnswers] = useState<AkinatorAnswerItem[]>([]);
  const [rejected, setRejected] = useState<number[]>([]);
  const [current, setCurrent] = useState<AkinatorStep | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<"correct" | "wrong" | null>(null);
  const history = useRef<Snapshot[]>([]);
  const generation = useRef(0);
  const pending = useRef(false);
  const prepared = useRef<Promise<Awaited<ReturnType<typeof startAkinator>> | null> | null>(null);

  // Prepare the first question while the player reads the introduction.
  useEffect(() => {
    const controller = new AbortController();
    prepared.current = startAkinator(controller.signal).catch(() => null);
    return () => { controller.abort(); generation.current++; };
  }, []);

  const start = async () => {
    if (pending.current) return;
    pending.current = true;
    const request = ++generation.current;
    setLoading(true); setError("");
    try {
      const warm = await prepared.current;
      prepared.current = null;
      const result = warm ?? await startAkinator();
      if (request !== generation.current) return;
      history.current = [];
      setAnswers([]); setRejected([]); setOutcome(null);
      setSessionToken(result.sessionToken);
      setCurrent({ type: "question", question: result.question, step: result.step, candidates: result.candidates });
    } catch (cause) {
      if (request === generation.current) setError(cause instanceof Error ? cause.message : "Не вдалося почати гру");
    } finally { pending.current = false; if (request === generation.current) setLoading(false); }
  };

  const advance = async (nextAnswers: AkinatorAnswerItem[], nextRejected: number[]) => {
    if (!current || pending.current) return;
    pending.current = true;
    const request = ++generation.current;
    setLoading(true); setError("");
    try {
      const next = await nextAkinator(sessionToken, nextAnswers, nextRejected);
      if (request !== generation.current) return;
      history.current.push({ current, answers, rejected });
      setAnswers(nextAnswers); setRejected(nextRejected); setCurrent(next); setOutcome(null);
    } catch (cause) {
      if (request === generation.current) setError(cause instanceof Error ? cause.message : "Не вдалося продовжити гру");
    } finally { pending.current = false; if (request === generation.current) setLoading(false); }
  };

  const answer = (value: AkinatorAnswer) => {
    if (current?.question) void advance([...answers, { questionId: current.question.id, answer: value }], rejected);
  };
  const undo = () => {
    if (pending.current) return;
    const previous = history.current.pop();
    if (!previous) return;
    setCurrent(previous.current); setAnswers(previous.answers); setRejected(previous.rejected); setOutcome(null); setError("");
  };
  const finish = async (correct: boolean) => {
    if (!current?.guess || pending.current) return;
    void logAkinatorResult(sessionToken, current.guess.tmdbId, correct, answers).catch(() => undefined);
    if (correct) setOutcome("correct");
    else await advance(answers, [...rejected, current.guess.tmdbId]);
  };

  return { current, loading, error, outcome, answers, start, answer, finish, undo, canUndo: history.current.length > 0 };
}

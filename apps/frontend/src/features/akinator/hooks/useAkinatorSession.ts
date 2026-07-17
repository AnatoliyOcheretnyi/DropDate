"use client";

import { useState } from "react";
import { AkinatorApiError, logAkinatorResult, nextAkinator, startAkinator, type AkinatorAnswer, type AkinatorAnswerItem, type AkinatorStep } from "../api/akinator";

const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));

export function useAkinatorSession() {
  const [sessionToken, setSessionToken] = useState("");
  const [answers, setAnswers] = useState<AkinatorAnswerItem[]>([]);
  const [current, setCurrent] = useState<AkinatorStep | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [outcome, setOutcome] = useState<"correct" | "wrong" | null>(null);

  const start = async () => {
    setLoading(true); setError(""); setOutcome(null); setAnswers([]);
    try {
      let result: Awaited<ReturnType<typeof startAkinator>>;
      for (let attempt = 0; ; attempt++) {
        try {
          result = await startAkinator();
          break;
        } catch (cause) {
          if (!(cause instanceof AkinatorApiError) || cause.status !== 503 || attempt >= 19) throw cause;
          setError(cause.message);
          await wait(3000);
        }
      }
      setSessionToken(result.sessionToken);
      setCurrent({ type: "question", question: result.question, step: result.step, candidates: result.candidates });
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Не вдалося почати гру"); }
    finally { setLoading(false); }
  };

  const answer = async (value: AkinatorAnswer) => {
    if (!current?.question || loading) return;
    const nextAnswers = [...answers, { questionId: current.question.id, answer: value }];
    setAnswers(nextAnswers); setLoading(true); setError("");
    try { setCurrent(await nextAkinator(sessionToken, nextAnswers)); }
    catch (cause) { setAnswers(answers); setError(cause instanceof Error ? cause.message : "Не вдалося продовжити гру"); }
    finally { setLoading(false); }
  };

  const finish = async (correct: boolean) => {
    if (!current?.guess) return;
    setOutcome(correct ? "correct" : "wrong");
    void logAkinatorResult(sessionToken, current.guess.tmdbId, correct, answers);
  };

  return { current, loading, error, outcome, answers, start, answer, finish };
}

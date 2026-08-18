import { useCallback, useEffect, useState } from "react";
import {
  getMoodNext,
  getMoodPicks,
  type MoodPick,
  type MoodQuestion,
} from "../api/mood";
import {
  storageDelete,
  storageGetJSON,
  storageKeys,
  storageSetJSON,
} from "../../../shared/utils/storage";
type Status = "config" | "asking" | "loading" | "results" | "empty" | "error";
type Snapshot = {
  status: Status;
  depth: string;
  current?: MoodQuestion;
  history: MoodQuestion[];
  answers: Record<string, string>;
  picks: MoodPick[];
  shown: number[];
};
const initial: Snapshot = {
  status: "config",
  depth: "standard",
  history: [],
  answers: {},
  picks: [],
  shown: [],
};
export function useMoodSession() {
  const [state, setState] = useState<Snapshot>(
    () => storageGetJSON<Snapshot>(storageKeys.moodSession) ?? initial,
  );
  useEffect(() => {
    if (state.status === "asking" || state.status === "results")
      storageSetJSON(storageKeys.moodSession, state);
    else storageDelete(storageKeys.moodSession);
  }, [state]);
  const resolve = useCallback(
    async (answers: Record<string, string>, shown: number[], depth: string) => {
      setState((x) => ({ ...x, status: "loading" }));
      try {
        const result = await getMoodPicks(answers, shown, depth);
        setState((x) => ({
          ...x,
          status: result.items.length ? "results" : "empty",
          answers,
          picks: result.items,
          shown: [...shown, ...result.items.map((i) => i.tmdbId)],
        }));
      } catch {
        setState((x) => ({ ...x, status: "error" }));
      }
    },
    [],
  );
  const advance = useCallback(
    async (
      answers: Record<string, string>,
      history: MoodQuestion[],
      shown: number[],
      depth: string,
    ) => {
      setState((x) => ({ ...x, status: "loading" }));
      try {
        const next = await getMoodNext(depth, answers);
        if (next.done || !next.question) {
          await resolve(answers, shown, depth);
          return;
        }
        setState((x) => ({
          ...x,
          status: "asking",
          answers,
          history,
          current: next.question,
        }));
      } catch {
        setState((x) => ({ ...x, status: "error" }));
      }
    },
    [resolve],
  );
  const start = useCallback(
    (depth = "standard") => {
      const next = { ...initial, status: "loading" as const, depth };
      setState(next);
      void advance({}, [], [], depth);
    },
    [advance],
  );
  const answer = useCallback(
    (id: string) => {
      if (!state.current) return;
      const answers = { ...state.answers, [state.current.id]: id };
      void advance(
        answers,
        [...state.history, state.current],
        state.shown,
        state.depth,
      );
    },
    [advance, state],
  );
  const back = useCallback(() => {
    const previous = state.history.at(-1);
    if (!previous) return;
    const answers = { ...state.answers };
    delete answers[previous.id];
    setState((x) => ({
      ...x,
      status: "asking",
      current: previous,
      history: x.history.slice(0, -1),
      answers,
    }));
  }, [state]);
  const more = useCallback(
    () => void resolve(state.answers, state.shown, state.depth),
    [resolve, state],
  );
  const reset = useCallback(() => setState(initial), []);
  return {
    ...state,
    step: state.history.length + 1,
    // Soft estimate: the adaptive flow includes the mood sub-branch and the
    // thematic step, and never reads below the step actually reached.
    total: Math.max(state.depth === "quick" ? 6 : 8, state.history.length + 1),
    start,
    answer,
    back,
    more,
    reset,
  };
}

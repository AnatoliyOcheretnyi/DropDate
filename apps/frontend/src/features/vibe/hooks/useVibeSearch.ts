"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Suggestion } from "../../../shared/lib/release";
import { useUnsavedItems } from "../../../shared/lib/unsavedItems";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { searchByPhrase, searchByPlan } from "../api/vibeApi";
import type { VibeLabel, VibePlan, VibeResponse } from "../types";

type Status = "idle" | "loading" | "ready" | "error";

/**
 * Owns one associative search: the phrase, what the engine understood, the
 * accumulated pages and the edits the user makes to the plan.
 *
 * Editing a chip goes through /api/vibe/plan, which never calls the model — so
 * removing "Дорослішання" is instant and costs nothing.
 */
export function useVibeSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getListTypes, isReady: isSavedReady } = useSavedReleases();

  const initialPhrase = searchParams.get("q") ?? "";
  const [phrase, setPhrase] = useState(initialPhrase);
  const [plan, setPlan] = useState<VibePlan | null>(null);
  const [labels, setLabels] = useState<VibeLabel[]>([]);
  const [pages, setPages] = useState<Suggestion[][]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [reranked, setReranked] = useState(false);
  const [broadened, setBroadened] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const apply = useCallback((response: VibeResponse, append: boolean) => {
    setPlan(response.plan);
    setLabels(response.labels ?? []);
    setPage(response.page);
    setHasMore(response.hasMore);
    setReranked(response.reranked);
    setBroadened(response.broadened);
    setPages((prev) => (append ? [...prev, response.results] : [response.results]));
    setStatus("ready");
  }, []);

  const run = useCallback(
    async (task: () => Promise<VibeResponse>, append: boolean) => {
      const requestId = requestRef.current + 1;
      requestRef.current = requestId;
      setStatus("loading");
      setError(null);
      try {
        const response = await task();
        // A slower earlier request must not overwrite a newer answer.
        if (requestRef.current !== requestId) {
          return;
        }
        apply(response, append);
      } catch (err) {
        if (requestRef.current !== requestId) {
          return;
        }
        setStatus("error");
        setError(err instanceof Error ? err.message : "Щось пішло не так");
      }
    },
    [apply]
  );

  const search = useCallback(
    (nextPhrase: string) => {
      const trimmed = nextPhrase.trim();
      if (trimmed.length < 3) {
        return;
      }
      setPhrase(trimmed);
      // The phrase lives in the URL so a found combination can be shared.
      router.replace(`/vibe?q=${encodeURIComponent(trimmed)}`, { scroll: false });
      void run(() => searchByPhrase(trimmed, 1), false);
    },
    [router, run]
  );

  const applyPlan = useCallback(
    (nextPlan: VibePlan) => {
      void run(() => searchByPlan({ ...nextPlan, phrase }), false);
    },
    [phrase, run]
  );

  const removeLabel = useCallback(
    (label: VibeLabel) => {
      if (!plan) {
        return;
      }
      const next: VibePlan = { ...plan };
      switch (label.kind) {
        case "theme":
          next.themes = plan.themes.filter((id) => id !== label.id);
          break;
        case "genre":
          next.genres = plan.genres.filter((slug) => slug !== label.id);
          break;
        case "country":
          next.countries = (plan.countries ?? []).filter((code) => code !== label.id);
          break;
        case "years":
          next.yearFrom = 0;
          next.yearTo = 0;
          break;
        default:
          next.mediaTypes = [];
      }
      applyPlan(next);
    },
    [applyPlan, plan]
  );

  const addTheme = useCallback(
    (id: string) => {
      if (!plan || plan.themes.includes(id)) {
        return;
      }
      applyPlan({ ...plan, themes: [...plan.themes, id] });
    },
    [applyPlan, plan]
  );

  const addGenre = useCallback(
    (slug: string) => {
      if (!plan || plan.genres.includes(slug)) {
        return;
      }
      applyPlan({ ...plan, genres: [...plan.genres, slug] });
    },
    [applyPlan, plan]
  );

  const setMediaTypes = useCallback(
    (mediaTypes: string[]) => {
      if (!plan) {
        return;
      }
      applyPlan({ ...plan, mediaTypes });
    },
    [applyPlan, plan]
  );

  const loadMore = useCallback(() => {
    if (!plan || !hasMore || status === "loading") {
      return;
    }
    void run(() => searchByPlan({ ...plan, phrase }, page + 1), true);
  }, [hasMore, page, phrase, plan, run, status]);

  const fetched = useMemo(() => pages.flat(), [pages]);
  // Titles already in a list are not a discovery — same rule as the chip
  // picker. A title saved from this page keeps its slot until the next page or
  // the next search; only then does the rule drop it.
  const { items: results, hiddenCount } = useUnsavedItems(fetched, getListTypes, {
    resetKey: phrase,
    isReady: isSavedReady,
  });

  return {
    addGenre,
    addTheme,
    broadened,
    error,
    hasMore,
    hiddenCount,
    initialPhrase,
    labels,
    loadMore,
    phrase,
    plan,
    removeLabel,
    reranked,
    results,
    search,
    setMediaTypes,
    setPhrase,
    status,
  };
}

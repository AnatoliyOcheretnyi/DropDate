import { useToast } from "../../../shared/ui/Toast";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  Details,
  ReleaseInfo,
  Suggestion,
} from "../../../shared/types/release";
import { apiRequest } from "../../../shared/api/client";
import { buildFallbackRelease } from "../../../shared/utils/release";
import { useSaved } from "../../saved/hooks/useSaved";
import { useDebouncedValue } from "../../../shared/hooks/useDebouncedValue";
import {
  planWithout,
  searchByPhrase,
  searchByPlan,
  type VibeLabel,
  type VibePlan,
} from "../api/vibe";

type SearchPayload = {
  results: Suggestion[];
  page: number;
  totalPages: number;
  totalResults: number;
};

type DetailsPayload = {
  details: Details;
  release?: ReleaseInfo;
};

export type SearchMode = "title" | "phrase";

/**
 * A query that reads like a sentence rather than a title: three or more words,
 * or two long ones. Used only to *offer* the other engine — never to switch
 * silently, because "The Love Hypothesis" would trip it too.
 */
const looksLikePhrase = (value: string) => {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 3) return true;
  return words.length === 2 && value.trim().length >= 18;
};

export function useSearchScreen() {
  const { addRelease, isSuggestionSaved } = useSaved();
  const { showToast } = useToast();
  const titleRequest = useRef<AbortController | null>(null);
  const titleGeneration = useRef(0);
  const [titleError, setTitleError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<SearchMode>("title");
  const debouncedQuery = useDebouncedValue(query.trim(), 250);

  const [results, setResults] = useState<Suggestion[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "movie" | "tv">("all");
  const [sort, setSort] = useState<"relevance" | "year" | "title">("relevance");

  // Phrase mode keeps its own results: switching back and forth should not
  // re-run either engine.
  const [phraseResults, setPhraseResults] = useState<Suggestion[]>([]);
  const [labels, setLabels] = useState<VibeLabel[]>([]);
  const [plan, setPlan] = useState<VibePlan | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [broadened, setBroadened] = useState(false);
  const [phrasePage, setPhrasePage] = useState(1);
  const [phraseHasMore, setPhraseHasMore] = useState(false);
  const [isPhraseLoading, setIsPhraseLoading] = useState(false);
  const [phraseError, setPhraseError] = useState<string | null>(null);
  /** The phrase the current interpretation belongs to. */
  const [answeredPhrase, setAnsweredPhrase] = useState("");

  const requestId = useRef(0);

  const loadResults = useCallback(
    async (nextPage: number, append: boolean) => {
      titleRequest.current?.abort();
      const controller = new AbortController();
      titleRequest.current = controller;
      const generation = ++titleGeneration.current;
      setTitleError(null);
      if (!debouncedQuery) {
        setResults([]);
        setPage(1);
        setTotalPages(1);
        return;
      }
      setIsLoading(true);
      try {
        const payload = await apiRequest<SearchPayload>(
          `/search?query=${encodeURIComponent(debouncedQuery)}&page=${nextPage}`,
          { signal: controller.signal },
        );
        if (generation !== titleGeneration.current || controller.signal.aborted)
          return;
        setResults((prev) => [
          ...new Map(
            (append
              ? [...prev, ...(payload.results ?? [])]
              : (payload.results ?? [])
            ).map((item) => [`${item.mediaType}:${item.id}`, item]),
          ).values(),
        ]);
        setPage(payload.page || nextPage);
        setTotalPages(payload.totalPages || 1);
      } catch {
        if (
          generation === titleGeneration.current &&
          !controller.signal.aborted
        )
          setTitleError("Не вдалося завантажити результати. Спробуй ще раз.");
      } finally {
        if (generation === titleGeneration.current) setIsLoading(false);
      }
    },
    [debouncedQuery],
  );

  useEffect(() => {
    if (mode !== "title") {
      titleRequest.current?.abort();
      titleGeneration.current++;
      setIsLoading(false);
      return;
    }
    if (debouncedQuery.length < 2) {
      titleRequest.current?.abort();
      titleGeneration.current++;
      setIsLoading(false);
      setResults([]);
      setPage(1);
      setTotalPages(1);
      return;
    }
    setPage(1);
    void loadResults(1, false);
    const controller = titleRequest.current;
    return () => controller?.abort();
  }, [debouncedQuery, loadResults, mode]);

  const applyVibe = useCallback(
    async (
      run: (
        page: number,
      ) => Promise<Awaited<ReturnType<typeof searchByPhrase>>>,
      nextPage: number,
      append: boolean,
      phrase: string,
    ) => {
      const id = ++requestId.current;
      setIsPhraseLoading(true);
      setPhraseError(null);
      try {
        const response = await run(nextPage);
        // A slower earlier request must not overwrite a newer answer.
        if (id !== requestId.current) {
          return;
        }
        setPhraseResults((prev) =>
          append ? [...prev, ...response.results] : response.results,
        );
        setLabels(response.labels);
        setPlan(response.plan);
        setSummary(response.plan.summary ?? "");
        setBroadened(Boolean(response.broadened));
        setPhrasePage(response.page || nextPage);
        setPhraseHasMore(Boolean(response.hasMore));
        setAnsweredPhrase(phrase);
      } catch {
        if (id === requestId.current) {
          setPhraseError("Не вдалося розібрати запит. Спробуй ще раз.");
        }
      } finally {
        if (id === requestId.current) {
          setIsPhraseLoading(false);
        }
      }
    },
    [],
  );

  /** Phrase search is explicit: it costs an AI call, so no typing triggers it. */
  const runPhraseSearch = useCallback(
    (phrase?: string) => {
      const value = (phrase ?? query).trim();
      if (value.length < 3) {
        return;
      }
      if (phrase && phrase !== query) {
        setQuery(phrase);
      }
      setMode("phrase");
      setPhraseResults([]);
      void applyVibe((p) => searchByPhrase(value, p), 1, false, value);
    },
    [applyVibe, query],
  );

  const loadMorePhrase = useCallback(() => {
    if (!plan || isPhraseLoading || !phraseHasMore) {
      return;
    }
    void applyVibe(
      (p) => searchByPlan(plan, p),
      phrasePage + 1,
      true,
      answeredPhrase,
    );
  }, [
    answeredPhrase,
    applyVibe,
    isPhraseLoading,
    phraseHasMore,
    phrasePage,
    plan,
  ]);

  const removeLabel = useCallback(
    (label: VibeLabel) => {
      if (!plan) {
        return;
      }
      const next = planWithout(plan, label);
      setPhraseResults([]);
      void applyVibe((p) => searchByPlan(next, p), 1, false, answeredPhrase);
    },
    [answeredPhrase, applyVibe, plan],
  );

  const switchMode = useCallback(
    (next: SearchMode) => {
      setMode(next);
      if (next === "phrase" && query.trim().length >= 3 && !plan) {
        runPhraseSearch();
      }
    },
    [plan, query, runPhraseSearch],
  );

  const handleAdd = useCallback(
    async (item: Suggestion) => {
      if (isSuggestionSaved(item)) {
        return;
      }
      try {
        const payload = await apiRequest<DetailsPayload>(
          `/details?tmdbId=${item.id}&mediaType=${item.mediaType}`,
        );
        if (!payload.details) {
          return;
        }
        const release =
          payload.release ||
          buildFallbackRelease(payload.details as Details, item.mediaType);
        if (!release) {
          return;
        }
        await addRelease(release, {
          tmdbId: item.id,
          mediaType: item.mediaType,
          details: payload.details,
        });
      } catch {
        showToast("Не вдалося додати до списку. Спробуй ще раз.");
      }
    },
    [addRelease, isSuggestionSaved, showToast],
  );

  const filteredResults = useMemo(() => {
    const source = mode === "phrase" ? phraseResults : results;
    const filtered =
      filter === "all"
        ? source
        : source.filter((item) => item.mediaType === filter);
    if (sort === "relevance") return filtered;
    return [...filtered].sort((a, b) =>
      sort === "title"
        ? a.title.localeCompare(b.title, "uk")
        : Number(b.year || 0) - Number(a.year || 0),
    );
  }, [filter, mode, phraseResults, results, sort]);

  // The bridge between the two engines: a title search that looks like a
  // sentence offers the other one instead of leaving a dead end.
  const suggestPhraseSearch =
    mode === "title" &&
    looksLikePhrase(debouncedQuery) &&
    debouncedQuery.length >= 8 &&
    !isLoading;

  return {
    titleError,
    query,
    setQuery,
    mode,
    switchMode,
    filter,
    setFilter,
    sort,
    setSort,
    filteredResults,
    isLoading: mode === "phrase" ? isPhraseLoading : isLoading,
    page,
    totalPages,
    loadResults,
    handleAdd,
    isSuggestionSaved,
    // phrase mode
    labels,
    summary,
    broadened,
    phraseError,
    phraseHasMore,
    answeredPhrase,
    runPhraseSearch,
    loadMorePhrase,
    removeLabel,
    suggestPhraseSearch,
  };
}

"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import type { Details, ReleaseInfo, Suggestion } from "../../../shared/lib/release";
import { webQueryKeys } from "../../../shared/api/queryKeys";
import { copy } from "../../../shared/lib/strings";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { useSuggestions } from "../../../shared/hooks/useSuggestions";
import { useToasts } from "../../../shared/hooks/useToasts";
import type { ListType } from "../../../shared/types/releases";
import { fetchDetails } from "../api/detailsApi";

const formatDate = (value?: string) => {
  if (!value) {
    return copy.misc.dash;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
};

const yearFromDate = (value?: string) => {
  if (!value || value.length < 4) {
    return "";
  }
  return value.slice(0, 4);
};

export function useTitleDetails() {
  const params = useParams<{ mediaType: string; id: string }>();
  const router = useRouter();
  const mediaType = params?.mediaType || "";
  const id = Number(params?.id || 0);
  const isValidRequest = Boolean(id) && (mediaType === "movie" || mediaType === "tv");

  const [title, setTitle] = useState("");
  const [, setIsInputFocused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    savedCount,
    getListTypes,
    getSavedItem,
    setSuggestionLists,
    updateListStats,
    isSuggestionSaved,
  } = useSavedReleases();
  const { toasts, pushToast, dismissToast } = useToasts();
  const [localRating, setLocalRating] = useState<number | undefined>(undefined);
  const [localWatchCount, setLocalWatchCount] = useState<number>(0);

  const handleClearSelection = useCallback(() => {
    // Search overlay should only clear local selection; details errors come from the query.
  }, []);

  const { suggestions, isFetching: isFetchingSuggestions } = useSuggestions(
    title,
    null,
    handleClearSelection
  );

  const detailsQuery = useQuery({
    queryKey: webQueryKeys.details(mediaType, id),
    enabled: isValidRequest,
    queryFn: async ({ signal }) => {
      const { ok, payload } = await fetchDetails(id, mediaType, signal);
      if (!ok || !payload) {
        throw new Error(copy.errors.detailsLoad);
      }
      return payload;
    },
    staleTime: 1000 * 60 * 10,
  });

  const details = detailsQuery.data?.details ?? null;
  const release = detailsQuery.data?.release ?? null;
  const recommendations = detailsQuery.data?.recommendations ?? [];
  const isLoading = detailsQuery.isLoading;
  const error = !isValidRequest
    ? copy.errors.invalidRequest
    : detailsQuery.isError
    ? copy.errors.detailsLoad
    : null;

  const buildFallbackRelease = useCallback(
    (payload: Details, media: Suggestion["mediaType"]): ReleaseInfo | null => {
      const dateSource =
        payload.nextAirDate ||
        payload.releaseDate ||
        payload.lastAirDate ||
        payload.firstAirDate;
      if (!dateSource) {
        return null;
      }
      const parsed = new Date(dateSource);
      const isValid = !Number.isNaN(parsed.getTime());
      const dateValue = isValid ? parsed.toISOString() : dateSource;
      const isFuture = isValid ? parsed.getTime() > Date.now() : false;
      const status =
        media === "movie"
          ? isFuture
            ? "upcoming"
            : "released"
          : payload.status?.toLowerCase().includes("ended")
          ? "ended"
          : payload.status?.toLowerCase().includes("canceled")
          ? "ended"
          : payload.nextAirDate && isFuture
          ? "upcoming"
          : payload.lastAirDate
          ? "ended"
          : "upcoming";

      return {
        title: payload.title,
        type: media === "movie" ? "movie" : "series",
        nextRelease: dateValue,
        source: "tmdb",
        posterUrl: payload.posterUrl,
        backdropUrl: payload.backdropUrl,
        status,
      };
    },
    []
  );

  const handleSearchToggle = () => {
    setIsSearchOpen((prev) => !prev);
  };

  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false);
    setIsInputFocused(false);
  }, []);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    setIsSearchOpen(false);
    setIsInputFocused(false);
    router.push(`/search?query=${encodeURIComponent(trimmed)}`);
  };

  const handleSuggestionSelect = useCallback(
    (suggestion: Suggestion) => {
      setIsSearchOpen(false);
      setIsInputFocused(false);
      router.push(`/title/${suggestion.mediaType}/${suggestion.id}`);
    },
    [router]
  );

  const handleNav = (view: string) => {
    if (view === "saved") {
      router.push("/saved");
      return;
    }
    router.push("/");
  };

  const currentSuggestion = useMemo(() => {
    if (!details) {
      return null;
    }
    return {
      id: details.id,
      title: details.title,
      mediaType: details.mediaType,
      year: yearFromDate(details.releaseDate || details.firstAirDate),
      posterUrl: details.posterUrl,
    } satisfies Suggestion;
  }, [details]);

  const currentListTypes = useMemo(
    () => (currentSuggestion ? getListTypes(currentSuggestion) : []),
    [currentSuggestion, getListTypes]
  );
  const currentSavedItem = useMemo(
    () => (currentSuggestion ? getSavedItem(currentSuggestion) : undefined),
    [currentSuggestion, getSavedItem]
  );
  const statusListType = useMemo(() => {
    if (currentListTypes.includes("favorite")) return "favorite";
    if (currentListTypes.includes("liked")) return "liked";
    if (currentListTypes.includes("watched")) return "watched";
    if (currentListTypes.includes("disliked")) return "disliked";
    return null;
  }, [currentListTypes]);

  const currentRelease = useMemo(() => {
    if (!details) {
      return null;
    }
    return release || buildFallbackRelease(details, details.mediaType);
  }, [buildFallbackRelease, details, release]);

  const listLabelMap = useMemo<Record<ListType, string>>(
    () => ({
      follow: copy.lists?.follow ?? "Підписка",
      watchlist: copy.lists?.watchlist ?? "Хочу подивитись",
      favorite: copy.lists?.favorite ?? "Улюблене",
      liked: copy.lists?.liked ?? "Сподобалось",
      watched: copy.lists?.watched ?? "Переглянуто",
      disliked: copy.lists?.disliked ?? "Не сподобалось",
    }),
    []
  );

  const handleListChange = useCallback(
    (next: ListType[]) => {
      if (!currentSuggestion || !currentRelease) {
        return;
      }
      const prev = currentListTypes;
      const added = next.filter((entry) => !prev.includes(entry));
      const removed = prev.filter((entry) => !next.includes(entry));
      if (added.length === 0 && removed.length === 0) {
        return;
      }

      setSuggestionLists(currentSuggestion, next, currentRelease);

      const message =
        added.length > 0
          ? `Додано до списку "${listLabelMap[added[0]]}"`
          : `Видалено зі списку "${listLabelMap[removed[0]]}"`;
      const tone = added.length > 0 ? "success" : "warning";
      const undo = () => {
        setSuggestionLists(currentSuggestion, prev, currentRelease);
      };

      pushToast(message, tone, undo);
    },
    [
      currentListTypes,
      currentRelease,
      currentSuggestion,
      listLabelMap,
      pushToast,
      setSuggestionLists,
    ]
  );

  useEffect(() => {
    if (!statusListType) {
      setLocalRating(undefined);
      setLocalWatchCount(0);
      return;
    }
    setLocalRating(currentSavedItem?.userRating);
    setLocalWatchCount(currentSavedItem?.watchCount || 1);
  }, [
    currentSavedItem?.userRating,
    currentSavedItem?.watchCount,
    statusListType,
  ]);

  const handleRatingChange = (value: number) => {
    if (!currentSuggestion || !statusListType) {
      return;
    }
    setLocalRating(value);
    updateListStats(currentSuggestion, statusListType, { userRating: value });
  };

  const handleWatchCountChange = (delta: number) => {
    if (!currentSuggestion || !statusListType) {
      return;
    }
    const next = Math.max(1, (localWatchCount || 1) + delta);
    setLocalWatchCount(next);
    updateListStats(currentSuggestion, statusListType, {
      watchCount: next,
      lastWatchedAt: new Date().toISOString(),
    });
  };

  const metaRows = useMemo(() => {
    if (!details) {
      return [];
    }
    return [
      {
        label: copy.details.labels.type,
        value:
          details.mediaType === "movie"
            ? copy.mediaType.movie
            : copy.mediaType.series,
      },
      {
        label: copy.details.labels.status,
        value: details.status || copy.misc.dash,
      },
      {
        label: copy.details.labels.release,
        value: details.releaseDate
          ? formatDate(details.releaseDate)
          : formatDate(details.firstAirDate),
      },
      {
        label: copy.details.labels.runtime,
        value: details.runtime
          ? `${details.runtime} ${copy.details.facts.minutesSuffix}`
          : copy.misc.dash,
      },
      {
        label: copy.details.labels.seasonsEpisodes,
        value:
          details.seasonCount || details.episodeCount
            ? `${details.seasonCount || 0} / ${details.episodeCount || 0}`
            : copy.misc.dash,
      },
      {
        label: copy.details.labels.rating,
        value: details.voteAverage
          ? details.voteAverage.toFixed(1)
          : copy.misc.dash,
      },
      {
        label: copy.details.labels.votes,
        value: details.voteCount
          ? details.voteCount.toString()
          : copy.misc.dash,
      },
      {
        label: copy.details.labels.popularity,
        value: details.popularity
          ? details.popularity.toFixed(1)
          : copy.misc.dash,
      },
    ];
  }, [details]);

  return {
    blurTimeoutRef,
    currentListTypes,
    currentRelease,
    details,
    dismissToast,
    error,
    formatDate,
    getListTypes,
    handleListChange,
    handleNav,
    handleRatingChange,
    handleSearchClose,
    handleSearchSubmit,
    handleSearchToggle,
    handleSuggestionSelect,
    handleWatchCountChange,
    isFetchingSuggestions,
    isLoading,
    isSearchOpen,
    isSuggestionSaved,
    localRating,
    localWatchCount,
    metaRows,
    recommendations,
    release,
    savedCount,
    setIsInputFocused,
    setLocalRating,
    setTitle,
    statusListType,
    suggestions,
    title,
    toasts,
    yearFromDate,
  };
}

import { useCallback } from "react";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import type {
  Details,
  ReleaseInfo,
  Suggestion,
} from "../../../shared/types/release";
import { apiRequest } from "../../../shared/api/client";
import { queryKeys } from "../../../shared/api/queryKeys";
import { buildFallbackRelease } from "../../../shared/utils/release";
import { useSaved } from "../../saved/hooks/useSaved";
import { copy } from "../../../shared/strings";

type DetailsPayload = {
  details: Details;
  release?: ReleaseInfo;
  recommendations?: Suggestion[];
};

export function useDetailsScreen() {
  const { mediaType, id } = useLocalSearchParams<{
    mediaType: string;
    id: string;
  }>();
  const { addRelease, isSuggestionSaved } = useSaved();

  const isValidRequest =
    Boolean(id) && (mediaType === "movie" || mediaType === "tv");

  const detailsQuery = useQuery<DetailsPayload>({
    queryKey: queryKeys.details(mediaType ?? "", Number(id)),
    enabled: isValidRequest,
    queryFn: ({ signal }) =>
      apiRequest<DetailsPayload>(
        `/details?tmdbId=${id}&mediaType=${mediaType}`,
        { signal },
      ),
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

  const handleAdd = useCallback(() => {
    if (!details) {
      return;
    }
    const releaseInfo =
      release || buildFallbackRelease(details, details.mediaType);
    if (!releaseInfo) {
      return;
    }
    addRelease(releaseInfo, {
      tmdbId: details.id,
      mediaType: details.mediaType,
      details,
    });
  }, [addRelease, details, release]);

  return {
    details,
    release,
    recommendations,
    isLoading,
    error,
    handleAdd,
    isSuggestionSaved,
  };
}

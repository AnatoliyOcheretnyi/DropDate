import { useCallback, useMemo } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import type { Details, ReleaseInfo, Suggestion } from '../../../shared/types/release';
import { getBackendURL } from '../../../shared/utils/config';
import { buildFallbackRelease } from '../../../shared/utils/release';
import { useSaved } from '../../saved/store/savedStore';
import { copy } from '../../../shared/strings';

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
  const backendURL = useMemo(() => getBackendURL(), []);
  const { addRelease, isSuggestionSaved } = useSaved();

  const isValidRequest = Boolean(id) && (mediaType === 'movie' || mediaType === 'tv');

  const detailsQuery = useQuery<DetailsPayload>({
    queryKey: ['details', mediaType, id],
    enabled: isValidRequest,
    queryFn: async () => {
      const response = await fetch(
        `${backendURL}/details?tmdbId=${id}&mediaType=${mediaType}`,
        { headers: { accept: 'application/json' } }
      );
      const payload = (await response.json()) as DetailsPayload;
      if (!response.ok) {
        throw new Error('details_failed');
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

  const handleAdd = useCallback(() => {
    if (!details) {
      return;
    }
    const releaseInfo = release || buildFallbackRelease(details, details.mediaType);
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

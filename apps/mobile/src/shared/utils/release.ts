import type { Details, ReleaseInfo, Suggestion } from '../types/release';

export function buildFallbackRelease(details: Details, mediaType: Suggestion['mediaType']): ReleaseInfo | null {
  const dateSource =
    details.nextAirDate ||
    details.releaseDate ||
    details.lastAirDate ||
    details.firstAirDate;
  if (!dateSource) {
    return null;
  }
  const parsed = new Date(dateSource);
  const isValid = !Number.isNaN(parsed.getTime());
  const dateValue = isValid ? parsed.toISOString() : dateSource;
  const isFuture = isValid ? parsed.getTime() > Date.now() : false;
  const status =
    mediaType === 'movie'
      ? isFuture
        ? 'upcoming'
        : 'released'
      : details.status?.toLowerCase().includes('ended')
      ? 'ended'
      : details.status?.toLowerCase().includes('canceled')
      ? 'ended'
      : details.nextAirDate && isFuture
      ? 'upcoming'
      : details.lastAirDate
      ? 'ended'
      : 'upcoming';

  return {
    title: details.title,
    type: mediaType === 'movie' ? 'movie' : 'series',
    nextRelease: dateValue,
    source: 'tmdb',
    posterUrl: details.posterUrl,
    backdropUrl: details.backdropUrl,
    status,
  };
}

export function interleaveSuggestions(movies: Suggestion[], series: Suggestion[]) {
  const mixed: Suggestion[] = [];
  const max = Math.max(movies.length, series.length);
  for (let i = 0; i < max; i += 1) {
    if (movies[i]) {
      mixed.push(movies[i]);
    }
    if (series[i]) {
      mixed.push(series[i]);
    }
  }
  return mixed;
}

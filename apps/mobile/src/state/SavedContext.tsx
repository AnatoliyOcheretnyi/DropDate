import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import type { Details, ReleaseInfo, Suggestion } from '../types/release';

type SavedItem = ReleaseInfo & {
  id: string;
  tmdbId: number;
  mediaType: Suggestion['mediaType'];
  savedAt: number;
  details?: Details;
};

type SavedContextValue = {
  saved: SavedItem[];
  addRelease: (release: ReleaseInfo, meta: { tmdbId: number; mediaType: Suggestion['mediaType']; details?: Details }) => void;
  removeRelease: (id: string) => void;
  isSuggestionSaved: (suggestion: Suggestion) => boolean;
  findByTmdbId: (tmdbId: number, mediaType: Suggestion['mediaType']) => SavedItem | undefined;
};

const SavedContext = createContext<SavedContextValue | undefined>(undefined);

const buildSavedId = (tmdbId: number, mediaType: Suggestion['mediaType']) => `${mediaType}:${tmdbId}`;

export function SavedProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<SavedItem[]>([]);

  const addRelease = useCallback(
    (release: ReleaseInfo, meta: { tmdbId: number; mediaType: Suggestion['mediaType']; details?: Details }) => {
      const id = buildSavedId(meta.tmdbId, meta.mediaType);
      setSaved((prev) => {
        if (prev.some((item) => item.id === id)) {
          return prev;
        }
        return [
          ...prev,
          {
            ...release,
            id,
            tmdbId: meta.tmdbId,
            mediaType: meta.mediaType,
            savedAt: Date.now(),
            details: meta.details,
          },
        ];
      });
    },
    []
  );

  const removeRelease = useCallback((id: string) => {
    setSaved((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const isSuggestionSaved = useCallback(
    (suggestion: Suggestion) => {
      const id = buildSavedId(suggestion.id, suggestion.mediaType);
      return saved.some((item) => item.id === id);
    },
    [saved]
  );

  const findByTmdbId = useCallback(
    (tmdbId: number, mediaType: Suggestion['mediaType']) =>
      saved.find((item) => item.tmdbId === tmdbId && item.mediaType === mediaType),
    [saved]
  );

  const value = useMemo(
    () => ({
      saved,
      addRelease,
      removeRelease,
      isSuggestionSaved,
      findByTmdbId,
    }),
    [addRelease, findByTmdbId, isSuggestionSaved, removeRelease, saved]
  );

  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

export function useSaved() {
  const actual = useContext(SavedContext);
  if (!actual) {
    throw new Error('SavedContext is missing');
  }
  return actual;
}

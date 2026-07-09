"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { webQueryKeys } from "../../../shared/api/queryKeys";
import { saveColdStartFilms } from "../../../shared/lib/coldStartFilms";
import { fetchHomeSections, type HomeSections } from "../api/homeApi";

export function useHomeSections(initialSections: HomeSections) {
  const query = useQuery({
    queryKey: webQueryKeys.home(),
    queryFn: async ({ signal }) => fetchHomeSections(signal),
    initialData: initialSections,
    staleTime: 1000 * 60 * 10,
  });

  // Stash the top-rated rail so the cold-start overlay has something to show on
  // the next visit, when the backend is asleep and cannot serve it.
  const topRated = query.data?.topRated;
  useEffect(() => {
    if (topRated && topRated.length > 0) {
      saveColdStartFilms(topRated);
    }
  }, [topRated]);

  return query;
}

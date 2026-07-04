"use client";

import { useQuery } from "@tanstack/react-query";
import { webQueryKeys } from "../../../shared/api/queryKeys";
import { fetchHomeSections, type HomeSections } from "../api/homeApi";

export function useHomeSections(initialSections: HomeSections) {
  return useQuery({
    queryKey: webQueryKeys.home(),
    queryFn: async ({ signal }) => fetchHomeSections(signal),
    initialData: initialSections,
    staleTime: 1000 * 60 * 10,
  });
}

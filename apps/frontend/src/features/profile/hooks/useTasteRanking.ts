"use client";

import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useTasteStore } from "../store/tasteStore";

export function useTasteRanking() {
  const { genres, countries, isReady, hydrate, reorder, reset } = useTasteStore(
    useShallow((state) => ({
      genres: state.genres,
      countries: state.countries,
      isReady: state.isReady,
      hydrate: state.hydrate,
      reorder: state.reorder,
      reset: state.reset,
    }))
  );

  useEffect(() => {
    if (!isReady) {
      hydrate();
    }
  }, [isReady, hydrate]);

  return { genres, countries, isReady, reorder, reset };
}

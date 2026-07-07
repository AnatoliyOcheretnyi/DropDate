"use client";

import { useEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useTasteStore } from "../store/tasteStore";

export function useTasteRanking() {
  const { genres, countries, isReady, hydrate, move, reset } = useTasteStore(
    useShallow((state) => ({
      genres: state.genres,
      countries: state.countries,
      isReady: state.isReady,
      hydrate: state.hydrate,
      move: state.move,
      reset: state.reset,
    }))
  );

  useEffect(() => {
    if (!isReady) {
      hydrate();
    }
  }, [isReady, hydrate]);

  return { genres, countries, isReady, move, reset };
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { Suggestion } from "../../lib/release";

export function useSuggestions(
  title: string,
  selected: Suggestion | null,
  onClearSelection: () => void
) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = title.trim();
    if (!trimmed || trimmed.length < 2) {
      setSuggestions([]);
      if (controllerRef.current) {
        controllerRef.current.abort();
      }
      if (selected) {
        onClearSelection();
      }
      return;
    }

    if (selected) {
      if (selected.title.toLowerCase() === trimmed.toLowerCase()) {
        setSuggestions([]);
        return;
      }
      onClearSelection();
    }

    setIsFetching(true);
    if (controllerRef.current) {
      controllerRef.current.abort();
    }
    const controller = new AbortController();
    controllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/suggest?query=${encodeURIComponent(trimmed)}`, {
          signal: controller.signal,
        });
        const payload = await response.json();
        if (response.ok) {
          setSuggestions((payload?.results as Suggestion[]) || []);
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setIsFetching(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [selected, title, onClearSelection]);

  return { suggestions, isFetching };
}

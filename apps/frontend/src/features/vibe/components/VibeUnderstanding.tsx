"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchVibeVocabulary } from "../api/vibeApi";
import type { VibeLabel, VibePlan } from "../types";

type Props = {
  plan: VibePlan;
  labels: VibeLabel[];
  isLoading: boolean;
  onRemove: (label: VibeLabel) => void;
  onAddTheme: (id: string) => void;
  onAddGenre: (slug: string) => void;
  onReset: () => void;
};

/**
 * The panel that makes the engine legible: it shows what the phrase was read as
 * and lets the reader fix it. Without it an AI search is a black box — no way
 * to tell why these titles came back, and no way to steer.
 */
export function VibeUnderstanding({
  plan,
  labels,
  isLoading,
  onRemove,
  onAddTheme,
  onAddGenre,
  onReset,
}: Props) {
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement | null>(null);

  const vocabulary = useQuery({
    queryKey: ["vibe", "vocabulary"],
    queryFn: ({ signal }) => fetchVibeVocabulary(signal),
    staleTime: 1000 * 60 * 60,
    enabled: isPickerOpen,
  });

  useEffect(() => {
    if (!isPickerOpen) {
      return;
    }
    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isPickerOpen]);

  const needle = search.trim().toLowerCase();
  const groups = useMemo(() => {
    const catalog = vocabulary.data?.themes ?? [];
    if (!needle) {
      return catalog;
    }
    return catalog
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.label.toLowerCase().includes(needle)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [needle, vocabulary.data]);

  const genres = useMemo(() => {
    const all = vocabulary.data?.genres ?? [];
    const available = all.filter((genre) => !plan.genres.includes(genre.slug));
    if (!needle) {
      return available;
    }
    return available.filter((genre) => genre.label.toLowerCase().includes(needle));
  }, [needle, plan.genres, vocabulary.data]);

  return (
    <div className={`vibe-understanding${isLoading ? " is-loading" : ""}`} ref={rootRef}>
      <div className="vibe-understanding__head">
        <div>
          <p className="vibe-understanding__label">Ми зрозуміли так</p>
          <p className="vibe-understanding__hint">
            {plan.source === "keywords"
              ? "Розібрали без AI — за словами у фразі. Виправ, якщо не те."
              : "Прибери зайве або додай своє — перезапит іде без AI"}
          </p>
        </div>
        <button type="button" className="vibe-understanding__reset" onClick={onReset}>
          Почати спочатку
        </button>
      </div>

      <div className="vibe-understanding__chips">
        {labels.map((label) => (
          <button
            key={`${label.kind}-${label.id}`}
            type="button"
            className="vibe-chip"
            onClick={() => onRemove(label)}
            aria-label={`Прибрати ${label.label}`}
          >
            {label.emoji ? <span aria-hidden="true">{label.emoji}</span> : null}
            {label.label}
            <span aria-hidden="true">✕</span>
          </button>
        ))}

        <div className="vibe-add">
          <button
            type="button"
            className="vibe-chip vibe-chip--add"
            onClick={() => setPickerOpen((prev) => !prev)}
            aria-expanded={isPickerOpen}
          >
            + Додати
          </button>

          {isPickerOpen ? (
            <div className="vibe-picker">
              <input
                type="search"
                className="vibe-picker__search"
                placeholder="Пошук теми або жанру"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <div className="vibe-picker__list">
                {vocabulary.isLoading ? (
                  <p className="vibe-picker__empty">Завантажуємо…</p>
                ) : null}

                {genres.length > 0 ? (
                  <>
                    <p className="vibe-picker__group">Жанри</p>
                    {genres.map((genre) => (
                      <button
                        key={genre.slug}
                        type="button"
                        className="vibe-picker__item"
                        onClick={() => {
                          onAddGenre(genre.slug);
                          setPickerOpen(false);
                        }}
                      >
                        {genre.label}
                      </button>
                    ))}
                  </>
                ) : null}

                {groups.map((group) => (
                  <div key={group.id}>
                    <p className="vibe-picker__group">{group.label}</p>
                    {group.items
                      .filter((item) => !plan.themes.includes(item.id))
                      .map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="vibe-picker__item"
                          onClick={() => {
                            onAddTheme(item.id);
                            setPickerOpen(false);
                          }}
                        >
                          {item.emoji ? <span aria-hidden="true">{item.emoji}</span> : null}
                          {item.label}
                        </button>
                      ))}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

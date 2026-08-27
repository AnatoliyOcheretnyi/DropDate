"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Suggestion } from "../../../shared/lib/release";
import type { ListType } from "../../../shared/types/releases";
import { webQueryKeys } from "../../../shared/api/queryKeys";
import { excludeSaved } from "../../../shared/lib/excludeSaved";
import { fetchDiscoverResults } from "../api/discoverApi";
import { SearchResultsGrid } from "../../../widgets/SearchResultsGrid";

type Chip = {
  id: string;
  label: string;
  icon?: string;
};

const GENRES: Chip[] = [
  { id: "action", label: "Бойовик", icon: "💥" },
  { id: "comedy", label: "Комедія", icon: "😂" },
  { id: "drama", label: "Драма", icon: "🎭" },
  { id: "scifi", label: "Фантастика", icon: "🛸" },
  { id: "horror", label: "Жахи", icon: "👻" },
  { id: "thriller", label: "Трилер", icon: "🔪" },
  { id: "romance", label: "Романтика", icon: "💘" },
  { id: "adventure", label: "Пригоди", icon: "🧭" },
  { id: "animation", label: "Анімація", icon: "🎨" },
  { id: "fantasy", label: "Фентезі", icon: "🐉" },
  { id: "crime", label: "Детектив", icon: "🕵️" },
  { id: "docs", label: "Документальні", icon: "🎥" },
];

const COUNTRIES: Chip[] = [
  { id: "us", label: "США", icon: "🇺🇸" },
  { id: "gb", label: "Британія", icon: "🇬🇧" },
  { id: "kr", label: "Корея", icon: "🇰🇷" },
  { id: "jp", label: "Японія", icon: "🇯🇵" },
  { id: "ua", label: "Україна", icon: "🇺🇦" },
  { id: "fr", label: "Франція", icon: "🇫🇷" },
  { id: "es", label: "Іспанія", icon: "🇪🇸" },
  { id: "in", label: "Індія", icon: "🇮🇳" },
];

// Hiding titles that are already in a list thins each page out, so a page that
// comes back mostly saved is topped up with the next one instead of leaving a
// short grid. Capped so a library that already owns the whole genre does not
// walk through TMDB page by page.
const MIN_VISIBLE_RESULTS = 12;
const MAX_AUTO_PAGES = 3;

// A few reliably-populated genres to offer as a quick escape from a dead end.
const RETRY_SUGGESTIONS = GENRES.filter((chip) =>
  ["comedy", "drama", "action"].includes(chip.id)
);

function ChipRow({
  label,
  items,
  selected,
  onToggle,
}: {
  label: string;
  items: Chip[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="taste-chips__row">
      <span className="taste-chips__row-label">{label}</span>
      <div className="taste-chips__row-items">
        {items.map((chip) => {
        const isActive = selected.has(chip.id);
        return (
          <button
            key={chip.id}
            type="button"
            className={`taste-chip${isActive ? " is-active" : ""}`}
            aria-pressed={isActive}
            onClick={() => onToggle(chip.id)}
          >
            {chip.icon ? (
              <span className="taste-chip__icon" aria-hidden="true">
                {chip.icon}
              </span>
            ) : null}
            <span>{chip.label}</span>
          </button>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({
  onReset,
  onTryGenre,
  allSaved,
}: {
  onReset: () => void;
  onTryGenre: (id: string) => void;
  /** Everything found under this combination is already in the user's lists. */
  allSaved?: boolean;
}) {
  return (
    <div className="taste-chips__empty">
      <span className="taste-chips__empty-icon" aria-hidden="true">
        {allSaved ? "✅" : "🍿"}
      </span>
      <strong className="taste-chips__empty-title">
        {allSaved
          ? "Усе знайдене вже у твоїх списках"
          : "Нічого не знайшли під цю комбінацію"}
      </strong>
      <p className="taste-chips__empty-text">
        {allSaved
          ? "Під цю комбінацію ми показуємо лише нове — а тут ти вже все зберіг. Спробуй інший жанр чи країну."
          : "Спробуй прибрати один із фільтрів або обрати інше поєднання жанру й країни."}
      </p>
      <button
        type="button"
        className="taste-chips__empty-reset"
        onClick={onReset}
      >
        Скинути всі фільтри
      </button>
      <div className="taste-chips__empty-suggestions">
        <span>Спробуй натомість:</span>
        {RETRY_SUGGESTIONS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className="taste-chip"
            onClick={() => onTryGenre(chip.id)}
          >
            <span className="taste-chip__icon" aria-hidden="true">
              {chip.icon}
            </span>
            <span>{chip.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="taste-chips__empty">
      <span className="taste-chips__empty-icon" aria-hidden="true">
        ⚠️
      </span>
      <strong className="taste-chips__empty-title">
        Не вдалося завантажити добірку
      </strong>
      <p className="taste-chips__empty-text">
        Схоже, щось пішло не так. Спробуй ще раз.
      </p>
      <button
        type="button"
        className="taste-chips__empty-reset"
        onClick={onRetry}
      >
        Спробувати знову
      </button>
    </div>
  );
}

type Props = {
  onSelect: (suggestion: Suggestion) => void;
  getListTypes: (suggestion: Suggestion) => ListType[];
  onChangeLists: (suggestion: Suggestion, next: ListType[]) => void;
};

export function TasteChips({ onSelect, getListTypes, onChangeLists }: Props) {
  const [genres, setGenres] = useState<Set<string>>(new Set());
  const [countries, setCountries] = useState<Set<string>>(new Set());

  const toggle =
    (setter: React.Dispatch<React.SetStateAction<Set<string>>>) =>
    (id: string) => {
      setter((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    };

  const genreList = useMemo(() => [...genres].sort(), [genres]);
  const countryList = useMemo(() => [...countries].sort(), [countries]);
  const hasSelection = genreList.length > 0 || countryList.length > 0;

  const discoverQuery = useInfiniteQuery({
    queryKey: webQueryKeys.discover(genreList, countryList),
    enabled: hasSelection,
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      fetchDiscoverResults(genreList, countryList, pageParam, signal),
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.page + 1 : undefined,
  });

  const fetched = useMemo(
    () => discoverQuery.data?.pages.flatMap((page) => page.results) ?? [],
    [discoverQuery.data]
  );
  // Titles already in a list are not a discovery.
  const results = useMemo(
    () => excludeSaved(fetched, getListTypes),
    [fetched, getListTypes]
  );
  const hiddenCount = fetched.length - results.length;
  const isLoading =
    discoverQuery.isLoading || discoverQuery.isFetchingNextPage;

  // Reset the top-up budget whenever the selection changes: a new combination
  // deserves its own attempts.
  const selectionKey = `${genreList.join(",")}|${countryList.join(",")}`;
  const autoPagesRef = useRef(0);
  useEffect(() => {
    autoPagesRef.current = 0;
  }, [selectionKey]);

  const { fetchNextPage, hasNextPage, isFetching } = discoverQuery;
  useEffect(() => {
    if (!hasSelection || !hasNextPage || isFetching) {
      return;
    }
    if (results.length >= MIN_VISIBLE_RESULTS) {
      return;
    }
    if (autoPagesRef.current >= MAX_AUTO_PAGES) {
      return;
    }
    autoPagesRef.current += 1;
    void fetchNextPage();
  }, [fetchNextPage, hasNextPage, hasSelection, isFetching, results.length]);

  const handleReset = () => {
    setGenres(new Set());
    setCountries(new Set());
  };

  const handleTryGenre = (id: string) => {
    setGenres(new Set([id]));
    setCountries(new Set());
  };

  return (
    <section className="taste-chips trend-bleed">
      <div className="trend-inner">
        <div className="taste-chips__head">
          <p className="browse__kicker">ПІД ТВІЙ СМАК</p>
          <h2 className="browse__title">Обери жанр чи країну</h2>
        </div>
        <ChipRow
          label="ЖАНРИ"
          items={GENRES}
          selected={genres}
          onToggle={toggle(setGenres)}
        />
        <ChipRow
          label="КРАЇНИ"
          items={COUNTRIES}
          selected={countries}
          onToggle={toggle(setCountries)}
        />

        {hasSelection ? (
          <div className="taste-chips__results">
            <div className="taste-chips__results-head">
              <p className="hint">
                {discoverQuery.isError
                  ? "Не вдалося завантажити добірку."
                  : isLoading && results.length === 0
                    ? "Шукаємо збіги за твоїм вибором…"
                    : `Показуємо збіги за твоїм вибором · ${results.length}${
                        hiddenCount > 0 ? ` · ${hiddenCount} вже у списках` : ""
                      }`}
              </p>
              <button
                type="button"
                className="taste-chips__reset"
                onClick={handleReset}
              >
                Скинути
              </button>
            </div>

            <SearchResultsGrid
              items={results}
              isLoading={isLoading}
              onSelect={onSelect}
              getListTypes={getListTypes}
              onChangeLists={onChangeLists}
              title="Результати"
              emptySlot={
                discoverQuery.isError ? (
                  <ErrorState onRetry={() => discoverQuery.refetch()} />
                ) : (
                  <EmptyState
                    onReset={handleReset}
                    onTryGenre={handleTryGenre}
                    allSaved={hiddenCount > 0}
                  />
                )
              }
              showEmpty
            />

            {discoverQuery.hasNextPage && (
              <button
                type="button"
                className="taste-chips__load-more"
                onClick={() => discoverQuery.fetchNextPage()}
                disabled={isLoading}
              >
                {isLoading ? "Завантажуємо…" : "Показати ще"}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}

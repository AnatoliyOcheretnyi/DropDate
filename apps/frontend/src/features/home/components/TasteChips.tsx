"use client";

import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import type { Suggestion } from "../../../shared/lib/release";
import type { ListType } from "../../../shared/types/releases";
import { webQueryKeys } from "../../../shared/api/queryKeys";
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
}: {
  onReset: () => void;
  onTryGenre: (id: string) => void;
}) {
  return (
    <div className="taste-chips__empty">
      <span className="taste-chips__empty-icon" aria-hidden="true">
        🍿
      </span>
      <strong className="taste-chips__empty-title">
        Нічого не знайшли під цю комбінацію
      </strong>
      <p className="taste-chips__empty-text">
        Спробуй прибрати один із фільтрів або обрати інше поєднання жанру й
        країни.
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

  const results = useMemo(
    () => discoverQuery.data?.pages.flatMap((page) => page.results) ?? [],
    [discoverQuery.data]
  );
  const isLoading =
    discoverQuery.isLoading || discoverQuery.isFetchingNextPage;

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
                    : `Показуємо збіги за твоїм вибором · ${results.length}`}
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
                  <EmptyState onReset={handleReset} onTryGenre={handleTryGenre} />
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

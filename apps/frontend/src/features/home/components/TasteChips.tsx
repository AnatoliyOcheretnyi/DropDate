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

function ChipRow({
  items,
  selected,
  onToggle,
}: {
  items: Chip[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="taste-chips__row">
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

  return (
    <section className="taste-chips trend-bleed">
      <div className="trend-inner">
        <div className="taste-chips__head">
          <p className="trend-kicker">Під твій смак</p>
          <h3>Обери жанр чи країну</h3>
        </div>
        <ChipRow items={GENRES} selected={genres} onToggle={toggle(setGenres)} />
        <ChipRow
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
                  : `Показуємо збіги за твоїм вибором${
                      isLoading ? "…" : ` · ${results.length}`
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
              emptyLabel="Нічого не знайшли під цей смак. Спробуй інше поєднання."
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

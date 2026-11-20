"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth, useAuth } from "../../../shared/state/auth";
import type { Suggestion } from "../../../shared/lib/release";
import type { ListType, SavedRelease } from "../../../shared/types/releases";
import { PosterCard } from "../../../shared/ui/PosterCard";
import { AnimatedMovieRail } from "./AnimatedMovieRail";
import { useRetainedData } from "../hooks/useRetainedData";
import { useSavedWrites } from "../../saved/store/savedWrites";
import { useFollowedPeopleStore } from "../../people/store/followedPeopleStore";

const COLLECTIONS = {
  released: {
    title: "Ти чекав — уже вийшло",
    description:
      "Прем’єри з твоїх «Хочу» та підписок. Доступність перегляду — на сторінці фільму.",
  },
  gems: {
    title: "Перлини під твій смак",
    description:
      "Менш відомі фільми у твоїх жанрах · рейтинг від 7 та 50–2000 оцінок у TMDB.",
  },
  country: {
    title: "Нова країна для тебе",
    description: "Знайомі жанри з країни, якої ще немає у твоєму кінопаспорті.",
  },
  people: {
    title: "Від твоїх улюблених режисерів та акторів",
    description: "З улюблених митців і фільмів, які тобі сподобались.",
  },
};
type Kind = keyof typeof COLLECTIONS;
type CollectionItem = Suggestion & {
  reason: string;
  rating?: number;
  personId?: number;
  country?: string;
};
type Collection = {
  items: CollectionItem[];
  partial: boolean;
  country?: string;
  countryName?: string;
  passportIncomplete?: boolean;
};
type Props = {
  kind: Kind;
  saved: SavedRelease[];
  getListTypes: (item: Suggestion) => ListType[];
  onChangeLists: (item: Suggestion, next: ListType[]) => void;
  onSelect: (item: Suggestion) => void;
};

export function PersonalCollection({
  kind,
  saved,
  getListTypes,
  onChangeLists,
  onSelect,
}: Props) {
  const { user, accessToken } = useAuth();
  const saving = useSavedWrites((state) =>
    state.writes.some(
      (write) => write.userId === user?.id && write.status === "pending",
    ),
  );
  const peopleVersion = useFollowedPeopleStore((state) =>
    kind === "people"
      ? state.people
          .map((p) => `${p.tmdbId}:${p.role}`)
          .sort()
          .join(",")
      : "",
  );
  // List changes, including removing a viewing status, rebuild the collection.
  const libraryVersion = saved
    .map(
      (item) =>
        `${item.tmdbId}:${item.mediaType}:${[...(item.listTypes ?? [])].sort().join(",")}:${item.userRating ?? ""}`,
    )
    .sort()
    .join("|");
  const query = useQuery({
    queryKey: [
      "home-collection",
      user?.id,
      kind,
      libraryVersion,
      peopleVersion,
    ],
    queryFn: async ({ signal }): Promise<Collection> => {
      const response = await fetchWithAuth(
        `/api/home/collection?kind=${kind}`,
        { signal },
        user?.id,
      );
      if (!response.ok) throw new Error("Не вдалося завантажити добірку");
      return response.json();
    },
    enabled: Boolean(user && accessToken) && !saving,
    staleTime: 5 * 60_000,
    retry: 1,
  });
  const data = useRetainedData(query.data, `${user?.id ?? "guest"}:${kind}`);
  const visible = (data?.items ?? []).filter((item) => {
    const lists = getListTypes(item);
    return kind === "released"
      ? !lists.some((list) =>
          ["favorite", "liked", "watched", "disliked"].includes(list),
        )
      : lists.length === 0;
  });
  // Keep a mounted rail while its last card exits or replacements are loading.
  const previousItems = useRetainedData(
    visible.length ? visible : undefined,
    `${user?.id ?? "guest"}:${kind}`,
  );
  if (
    !user ||
    (!query.isPending &&
      !query.isError &&
      !visible.length &&
      !previousItems?.length)
  )
    return null;
  const collection = COLLECTIONS[kind];
  return (
    <section
      className="home-collection trend-bleed"
      aria-labelledby={`collection-${kind}`}
    >
      <div className="trend-inner">
        <header className="home-collection__head">
          <div>
            <h2 id={`collection-${kind}`} className="home-collection__title">
              {collection.title}
            </h2>
            <p className="home-collection__description">
              {kind === "country" && data?.passportIncomplete
                ? "Країна, якої ще немає серед твоїх переглянутих фільмів із відомим походженням. Для частини бібліотеки TMDB не надав даних."
                : collection.description}
            </p>
          </div>
          {kind === "country" && data?.country && (
            <Link
              className="calendar-home__all"
              href={`/world?country=${data.country}&view=films`}
            >
              {data.countryName} ↗
            </Link>
          )}
        </header>
        {query.isPending && !data ? (
          <div
            className="home-collection__row"
            aria-label="Завантажуємо добірку"
            aria-busy="true"
          >
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className="home-collection__skeleton" />
            ))}
          </div>
        ) : null}
        <div className="home-rail-status" role="status" aria-live="polite">
          {data && (query.isFetching || saving) ? (
            <span className="home-rail-status__loading">
              Оновлюємо добірку…
            </span>
          ) : query.isError ? (
            <p className="home-collection__status">
              Не вдалося завантажити добірку.{" "}
              <button
                className="home-collection__retry"
                type="button"
                onClick={() => void query.refetch()}
              >
                Повторити
              </button>
            </p>
          ) : null}
        </div>
        {data || previousItems?.length ? (
          <AnimatedMovieRail
            key={`${user.id}:${kind}`}
            items={visible}
            className="home-collection__row home-collection__row--loaded"
            itemClassName="home-collection__item"
            busy={query.isFetching || saving}
            empty={
              !query.isFetching && !saving ? (
                <p className="home-collection__status">
                  У цій добірці поки немає нових фільмів.
                </p>
              ) : null
            }
          >
            {(item) => (
              <>
                <PosterCard
                  item={item}
                  listTypes={getListTypes(item)}
                  onChangeLists={onChangeLists}
                  onSelect={onSelect}
                  imageSizes="(max-width: 600px) 42vw, 180px"
                />
                <p className="home-collection__reason">
                  {item.rating ? (
                    <span className="home-collection__rating">
                      ★ {item.rating.toFixed(1)} ·{" "}
                    </span>
                  ) : null}
                  {item.reason}
                </p>
                {item.personId ? (
                  <Link
                    href={`/person/${item.personId}`}
                    className="home-collection__link"
                  >
                    Фільмографія ↗
                  </Link>
                ) : null}
              </>
            )}
          </AnimatedMovieRail>
        ) : null}
        {data?.partial ? (
          <p className="home-collection__status">
            Частина фільмів ще недоступна.{" "}
            <button
              type="button"
              className="home-collection__retry"
              onClick={() => void query.refetch()}
            >
              Оновити
            </button>
          </p>
        ) : null}
      </div>
    </section>
  );
}

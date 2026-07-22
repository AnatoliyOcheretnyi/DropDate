export type Filter = { id: string; label: string; icon: string };

/** Slugs must match `discoverMovieGenreIDs` / `discoverCountryCodes` on the API. */
export const GENRES: Filter[] = [
  { id: "action", label: "Бойовик", icon: "💥" },
  { id: "comedy", label: "Комедія", icon: "😂" },
  { id: "drama", label: "Драма", icon: "🎭" },
  { id: "scifi", label: "Фантастика", icon: "🛸" },
  { id: "horror", label: "Жахи", icon: "👻" },
  { id: "thriller", label: "Трилер", icon: "🔪" },
  { id: "romance", label: "Романтика", icon: "💘" },
  { id: "adventure", label: "Пригоди", icon: "🗺️" },
  { id: "animation", label: "Анімація", icon: "🎨" },
  { id: "fantasy", label: "Фентезі", icon: "🐉" },
  { id: "crime", label: "Кримінал", icon: "🚔" },
  { id: "docs", label: "Документальні", icon: "🎙️" },
];

export const COUNTRIES: Filter[] = [
  { id: "us", label: "США", icon: "🇺🇸" },
  { id: "gb", label: "Британія", icon: "🇬🇧" },
  { id: "kr", label: "Корея", icon: "🇰🇷" },
  { id: "jp", label: "Японія", icon: "🇯🇵" },
  { id: "ua", label: "Україна", icon: "🇺🇦" },
  { id: "fr", label: "Франція", icon: "🇫🇷" },
  { id: "es", label: "Іспанія", icon: "🇪🇸" },
  { id: "in", label: "Індія", icon: "🇮🇳" },
];

const labelOf = (list: Filter[], id: string) =>
  list.find((item) => item.id === id)?.label ?? id;

export const describeSelection = (genres: string[], countries: string[]) =>
  [
    ...genres.map((id) => labelOf(GENRES, id)),
    ...countries.map((id) => labelOf(COUNTRIES, id)),
  ].join(" · ");

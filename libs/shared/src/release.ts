export type ReleaseStatus = "upcoming" | "released" | "ended";
export type ReleaseType = "movie" | "series";

export type ReleaseInfo = {
  title: string;
  type: ReleaseType;
  nextRelease: string;
  source: string;
  posterUrl?: string;
  backdropUrl?: string;
  status: ReleaseStatus;
};

export type Suggestion = {
  id: number;
  title: string;
  mediaType: "movie" | "tv";
  year?: string;
  posterUrl?: string;
};

export type Details = {
  id: number;
  title: string;
  mediaType: "movie" | "tv";
  overview?: string;
  tagline?: string;
  posterUrl?: string;
  backdropUrl?: string;
  status?: string;
  releaseDate?: string;
  firstAirDate?: string;
  lastAirDate?: string;
  nextAirDate?: string;
  nextEpisodeName?: string;
  lastEpisodeName?: string;
  seasonCount?: number;
  episodeCount?: number;
  runtime?: number;
  genres?: string[];
  networks?: string[];
  voteAverage?: number;
  voteCount?: number;
  popularity?: number;
  homepage?: string;
  originCountry?: string[];
};

export function getReleaseStatusLabel(status: ReleaseStatus, type: ReleaseType): string {
  if (status === "released") {
    return type === "movie" ? "Фільм вже вийшов" : "Реліз відбувся";
  }
  if (status === "ended") {
    return "Серіал завершився";
  }
  return "Наступний реліз";
}

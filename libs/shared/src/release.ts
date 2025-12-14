export type ReleaseStatus = "upcoming" | "released" | "ended";
export type ReleaseType = "movie" | "series";

export type ReleaseInfo = {
  title: string;
  type: ReleaseType;
  nextRelease: string;
  source: string;
  posterUrl?: string;
  status: ReleaseStatus;
};

export type Suggestion = {
  id: number;
  title: string;
  mediaType: "movie" | "tv";
  year?: string;
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

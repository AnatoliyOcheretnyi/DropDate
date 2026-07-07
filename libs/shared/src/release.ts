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
  nextEpisodeSeason?: number;
  nextEpisodeNumber?: number;
  lastEpisodeName?: string;
  lastEpisodeSeason?: number;
  lastEpisodeNumber?: number;
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
  cast?: CastMember[];
  directors?: CrewMember[];
};

export type CastMember = {
  tmdbId: number;
  name: string;
  character?: string;
  profileUrl?: string;
};

export type PersonRole = "actor" | "director";

export type PersonCredit = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  role: "actor" | "director" | "writer";
  character?: string;
  job?: string;
  year?: string;
  releaseDate?: string;
  posterUrl?: string;
  voteAverage?: number;
  popularity?: number;
};

export type Person = {
  id: number;
  name: string;
  biography?: string;
  knownForDepartment?: string;
  birthday?: string;
  deathday?: string;
  placeOfBirth?: string;
  profileUrl?: string;
  homepage?: string;
  imdbId?: string;
  instagram?: string;
  twitter?: string;
  popularity?: number;
  credits?: PersonCredit[];
};

export type PersonPick = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  year?: string;
  posterUrl?: string;
  reason: string;
};

export type PersonFollow = {
  personId: number;
  role: PersonRole;
  name: string;
  profileUrl?: string;
  knownFor?: string;
  liked: boolean;
  subscribed: boolean;
};

export type CrewMember = {
  tmdbId: number;
  name: string;
  job?: string;
  profileUrl?: string;
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

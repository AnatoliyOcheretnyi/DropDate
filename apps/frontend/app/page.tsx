import type { Suggestion } from "../src/shared/lib/release";
import { HomeScreen } from "../src/features/home/screens/HomeScreen";

const DEFAULT_BACKEND_URL = "http://localhost:8080";

const fetchTrending = async (window: "day" | "week") => {
  const backendBase = process.env.BACKEND_URL || DEFAULT_BACKEND_URL;
  const backendURL = new URL("/trending", backendBase);
  backendURL.searchParams.set("window", window);
  backendURL.searchParams.set("limit", "18");

  try {
    const response = await fetch(backendURL, {
      headers: { accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) {
      return { movies: [] as Suggestion[], series: [] as Suggestion[] };
    }
    const payload = (await response.json()) as {
      movies?: Suggestion[];
      series?: Suggestion[];
    };
    return {
      movies: payload?.movies ?? [],
      series: payload?.series ?? [],
    };
  } catch {
    return { movies: [] as Suggestion[], series: [] as Suggestion[] };
  }
};

const fetchHome = async () => {
  const backendBase = process.env.BACKEND_URL || DEFAULT_BACKEND_URL;
  const backendURL = new URL("/home", backendBase);
  backendURL.searchParams.set("limit", "18");

  try {
    const response = await fetch(backendURL, {
      headers: { accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (!response.ok) {
      return { movies: [] as Suggestion[], series: [] as Suggestion[] };
    }
    const payload = (await response.json()) as {
      upcoming?: { movies?: Suggestion[]; series?: Suggestion[] };
      popular?: { movies?: Suggestion[]; series?: Suggestion[] };
      topRated?: { movies?: Suggestion[]; series?: Suggestion[] };
    };
    return {
      upcomingMovies: payload?.upcoming?.movies ?? [],
      upcomingSeries: payload?.upcoming?.series ?? [],
      popularMovies: payload?.popular?.movies ?? [],
      popularSeries: payload?.popular?.series ?? [],
      topRatedMovies: payload?.topRated?.movies ?? [],
      topRatedSeries: payload?.topRated?.series ?? [],
    };
  } catch {
    return {
      upcomingMovies: [] as Suggestion[],
      upcomingSeries: [] as Suggestion[],
      popularMovies: [] as Suggestion[],
      popularSeries: [] as Suggestion[],
      topRatedMovies: [] as Suggestion[],
      topRatedSeries: [] as Suggestion[],
    };
  }
};

const mixSuggestions = (movies: Suggestion[], series: Suggestion[]) => {
  const mixed: Suggestion[] = [];
  const max = Math.max(movies.length, series.length);
  for (let i = 0; i < max; i += 1) {
    if (movies[i]) {
      mixed.push(movies[i]);
    }
    if (series[i]) {
      mixed.push(series[i]);
    }
  }
  return mixed;
};

export default async function HomePage() {
  const homePayload = await fetchHome();

  const upcoming = mixSuggestions(
    homePayload.upcomingMovies,
    homePayload.upcomingSeries
  );
  const popularMovies = homePayload.popularMovies;
  const popularSeries = homePayload.popularSeries;
  const topRated = mixSuggestions(
    homePayload.topRatedMovies,
    homePayload.topRatedSeries
  );

  return (
    <HomeScreen
      sections={{
        upcoming,
        popularMovies,
        popularSeries,
        topRated,
      }}
    />
  );
}

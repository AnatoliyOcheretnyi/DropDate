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

const fetchCollection = async (path: string) => {
  const backendBase = process.env.BACKEND_URL || DEFAULT_BACKEND_URL;
  const backendURL = new URL(path, backendBase);
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
  const [upcomingPayload, popularPayload, topRatedPayload] =
    await Promise.all([
      fetchCollection("/upcoming"),
      fetchCollection("/popular"),
      fetchCollection("/top-rated"),
    ]);

  const upcoming = mixSuggestions(upcomingPayload.movies, upcomingPayload.series);
  const popularMovies = popularPayload.movies;
  const popularSeries = popularPayload.series;
  const topRated = mixSuggestions(topRatedPayload.movies, topRatedPayload.series);

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

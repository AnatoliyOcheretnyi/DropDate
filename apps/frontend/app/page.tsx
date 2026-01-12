import type { Suggestion } from "../lib/release";
import { HomeScreen } from "../src/features/home/screens/HomeScreen";

const DEFAULT_BACKEND_URL = "http://localhost:8080";

const fetchTrending = async () => {
  const backendBase = process.env.BACKEND_URL || DEFAULT_BACKEND_URL;
  const backendURL = new URL("/trending", backendBase);
  backendURL.searchParams.set("window", "week");
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

export default async function HomePage() {
  const { movies, series } = await fetchTrending();

  return <HomeScreen trendingMovies={movies} trendingSeries={series} />;
}

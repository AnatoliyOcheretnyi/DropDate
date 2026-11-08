import { fetchWithAuth } from "../../shared/state/auth";
import type { SavedRelease } from "../../shared/types/releases";

export function isPassportMovie(
  movie: Pick<SavedRelease, "mediaType" | "listTypes">,
): boolean {
  return (
    movie.mediaType === "movie" &&
    Boolean(
      movie.listTypes?.some(
        (kind) =>
          kind === "favorite" ||
          kind === "liked" ||
          kind === "watched" ||
          kind === "disliked",
      ),
    )
  );
}

export type WorldPassport = {
  countries: Record<string, number>;
  totalWatched: number;
  missing: number;
};

type PassportPage = WorldPassport & { nextOffset: number };

// Keep server requests bounded, but publish only a complete passport to the UI.
export async function loadWorldPassport(
  signal: AbortSignal,
): Promise<WorldPassport> {
  const result: WorldPassport = { countries: {}, totalWatched: 0, missing: 0 };
  let offset = 0;
  while (true) {
    signal.throwIfAborted();
    const response = await fetchWithAuth(
      `/api/world/passport?offset=${offset}`,
      { signal },
    );
    if (!response.ok) throw new Error("Не вдалося завантажити кінопаспорт");
    const page: PassportPage = await response.json();
    signal.throwIfAborted();
    result.totalWatched = page.totalWatched;
    result.missing += page.missing;
    for (const [code, count] of Object.entries(page.countries)) {
      result.countries[code] = (result.countries[code] ?? 0) + count;
    }
    if (page.nextOffset === -1) return result;
    if (
      !Number.isInteger(page.nextOffset) ||
      page.nextOffset <= offset ||
      page.nextOffset >= page.totalWatched
    ) {
      throw new Error(
        "Не вдалося завантажити весь кінопаспорт. Спробуй ще раз.",
      );
    }
    offset = page.nextOffset;
  }
}

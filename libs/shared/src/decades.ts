/**
 * Decade buckets for the library filters, shared by web and mobile so a chip
 * means the same span in both.
 *
 * Newest first: most of a library is recent, and the oldest bucket is open
 * ended because splitting the 1950s from the 1960s buys nothing when a whole
 * library holds a handful of them.
 */
export type Decade = {
  id: string;
  label: string;
  /** Inclusive. */
  from: number;
  /** Inclusive; omitted means "and newer". */
  to?: number;
};

export const DECADES: Decade[] = [
  { id: "2020s", label: "2020-ті", from: 2020 },
  { id: "2010s", label: "2010-ті", from: 2010, to: 2019 },
  { id: "2000s", label: "2000-ні", from: 2000, to: 2009 },
  { id: "1990s", label: "90-ті", from: 1990, to: 1999 },
  { id: "1980s", label: "80-ті", from: 1980, to: 1989 },
  { id: "older", label: "До 80-х", from: 0, to: 1979 },
];

export const decadeById = (id: string) =>
  DECADES.find((decade) => decade.id === id);

/** Year of an ISO-ish date string, or undefined when there is nothing to read. */
export const yearOfDate = (value?: string | null): number | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getFullYear();
  }
  // Some sources carry a bare "1994" or "1994-00-00".
  const match = /^(\d{4})/.exec(String(value).trim());
  return match ? Number(match[1]) : undefined;
};

export const decadeOfYear = (year?: number): Decade | undefined =>
  year === undefined
    ? undefined
    : DECADES.find(
        (decade) =>
          year >= decade.from && (decade.to === undefined || year <= decade.to),
      );

/** Decades combine with OR, exactly like genres. */
export const matchesDecades = (year: number | undefined, ids: string[]) => {
  if (ids.length === 0) {
    return true;
  }
  if (year === undefined) {
    // A title with no known year cannot claim to be in a decade; hiding it is
    // more honest than letting it pass every filter.
    return false;
  }
  return ids.some((id) => {
    const decade = decadeById(id);
    if (!decade) {
      return false;
    }
    return year >= decade.from && (decade.to === undefined || year <= decade.to);
  });
};

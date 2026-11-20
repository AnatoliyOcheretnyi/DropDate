/**
 * Release countdowns, TV Time style: a date is only interesting relative to
 * today, so every surface that shows one goes through here instead of
 * formatting `nextRelease` on its own.
 */

export type CountdownTone = "today" | "soon" | "later" | "past";

const MS_PER_DAY = 86_400_000;

/** Midnight in the device's own calendar — countdowns are day-based, not hour-based. */
const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/**
 * Whole days from today to `value`. `0` is today, `1` tomorrow, negatives are
 * in the past. Returns `null` for a missing or unparsable date.
 */
export function daysUntil(value?: string | null, now: Date = new Date()) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.round((startOfDay(parsed) - startOfDay(now)) / MS_PER_DAY);
}

export function countdownTone(days: number | null): CountdownTone {
  if (days === null) return "later";
  if (days < 0) return "past";
  if (days === 0) return "today";
  if (days <= 7) return "soon";
  return "later";
}

export const dayWord = (count: number) => {
  const teens = count % 100;
  const last = count % 10;
  if (teens >= 11 && teens <= 14) return "днів";
  if (last === 1) return "день";
  if (last >= 2 && last <= 4) return "дні";
  return "днів";
};

const pluralMonths = (count: number) => {
  const teens = count % 100;
  const last = count % 10;
  if (teens >= 11 && teens <= 14) return "місяців";
  if (last === 1) return "місяць";
  if (last >= 2 && last <= 4) return "місяці";
  return "місяців";
};

/**
 * The line a countdown pill shows. Anything past two months stops being a
 * countdown and becomes a rough distance — "через 214 днів" reads as noise.
 */
export function formatCountdown(days: number | null) {
  if (days === null) return null;
  if (days < 0) return "Вже вийшло";
  if (days === 0) return "Сьогодні";
  if (days === 1) return "Завтра";
  if (days <= 60) return `Через ${days} ${dayWord(days)}`;
  const months = Math.round(days / 30);
  return `Через ${months} ${pluralMonths(months)}`;
}

/** The same thing at pill width: "3 дні", "Сьогодні", "2 міс.". */
export function formatCountdownShort(days: number | null) {
  if (days === null) return null;
  if (days < 0) return "Вийшло";
  if (days === 0) return "Сьогодні";
  if (days === 1) return "Завтра";
  if (days <= 60) return `${days} ${dayWord(days)}`;
  return `${Math.round(days / 30)} міс.`;
}

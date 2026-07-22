import { create } from "zustand";
import {
  storageGetJSON,
  storageKeys,
  storageSetJSON,
} from "../../../shared/utils/storage";
export type TasteKind = "genre" | "country";
const genres = [
  "Бойовик",
  "Комедія",
  "Драма",
  "Фантастика",
  "Трилер",
  "Пригоди",
  "Жахи",
  "Романтика",
  "Анімація",
  "Фентезі",
  "Детектив",
  "Документальні",
];
const countries = [
  "США",
  "Британія",
  "Корея",
  "Японія",
  "Україна",
  "Франція",
  "Іспанія",
  "Індія",
];
type State = {
  genres: string[];
  countries: string[];
  move: (kind: TasteKind, index: number, delta: number) => void;
  reset: (kind: TasteKind) => void;
};
const stored = storageGetJSON<Pick<State, "genres" | "countries">>(
  storageKeys.tasteProfile,
);
export const useTasteStore = create<State>((set) => ({
  genres: stored?.genres ?? genres,
  countries: stored?.countries ?? countries,
  move: (kind, index, delta) =>
    set((state) => {
      const list = [...(kind === "genre" ? state.genres : state.countries)];
      const to = index + delta;
      if (to < 0 || to >= list.length) return state;
      [list[index], list[to]] = [list[to], list[index]];
      const next = {
        genres: kind === "genre" ? list : state.genres,
        countries: kind === "country" ? list : state.countries,
      };
      storageSetJSON(storageKeys.tasteProfile, next);
      return next;
    }),
  reset: (kind) =>
    set((state) => {
      const next = {
        genres: kind === "genre" ? [...genres] : state.genres,
        countries: kind === "country" ? [...countries] : state.countries,
      };
      storageSetJSON(storageKeys.tasteProfile, next);
      return next;
    }),
}));

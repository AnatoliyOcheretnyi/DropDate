import { create } from "zustand";
import { storageGetJSON, storageSetJSON } from "./storage";
const key = "dropdate_watch_preferences";
type Preferences = { region: string; ids: number[] };
const saved = storageGetJSON<Preferences>(key);
export const useWatchPreferences = create<
  Preferences & {
    setRegion: (region: string) => void;
    toggleProvider: (id: number) => void;
  }
>((set) => ({
  region:
    typeof saved?.region === "string" && /^[A-Z]{2}$/.test(saved.region)
      ? saved.region
      : "UA",
  ids: Array.isArray(saved?.ids)
    ? saved.ids.filter((id) => Number.isInteger(id) && id > 0).slice(0, 10)
    : [],
  setRegion: (region) =>
    set(() => {
      const next = { region, ids: [] };
      storageSetJSON(key, next);
      return next;
    }),
  toggleProvider: (id) =>
    set((state) => {
      const ids = state.ids.includes(id)
        ? state.ids.filter((i) => i !== id)
        : [...state.ids, id].slice(0, 10);
      storageSetJSON(key, { region: state.region, ids });
      return { ids };
    }),
}));

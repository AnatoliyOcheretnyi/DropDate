"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { SavedRelease } from "../../../shared/types/releases";
import {
  readSavedFromStorage,
  writeSavedToStorage,
} from "../utils/savedState";

type SavedStore = {
  saved: SavedRelease[];
  isReady: boolean;
  isRefreshing: boolean;
  hydrate: () => void;
  setSaved: (saved: SavedRelease[]) => void;
  updateSaved: (updater: (saved: SavedRelease[]) => SavedRelease[]) => void;
  setRefreshing: (value: boolean) => void;
  clear: () => void;
};

export const useSavedStore = create<SavedStore>((set) => ({
  saved: [],
  isReady: false,
  isRefreshing: false,
  hydrate: () => {
    set({ saved: readSavedFromStorage(), isReady: true });
  },
  setSaved: (saved) => {
    writeSavedToStorage(saved);
    set({ saved });
  },
  updateSaved: (updater) => {
    set((state) => {
      const next = updater(state.saved);
      writeSavedToStorage(next);
      return { saved: next };
    });
  },
  setRefreshing: (value) => {
    set({ isRefreshing: value });
  },
  clear: () => {
    writeSavedToStorage([]);
    set({ saved: [], isReady: true });
  },
}));

export const useSavedStoreSnapshot = () =>
  useSavedStore(
    useShallow((state) => ({
      saved: state.saved,
      isReady: state.isReady,
      isRefreshing: state.isRefreshing,
      hydrate: state.hydrate,
      setSaved: state.setSaved,
      updateSaved: state.updateSaved,
      setRefreshing: state.setRefreshing,
      clear: state.clear,
    }))
  );

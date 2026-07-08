"use client";

import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { SavedRelease } from "../../../shared/types/releases";

type SavedStore = {
  saved: SavedRelease[];
  isReady: boolean;
  isRefreshing: boolean;
  setSaved: (saved: SavedRelease[]) => void;
  updateSaved: (updater: (saved: SavedRelease[]) => SavedRelease[]) => void;
  setRefreshing: (value: boolean) => void;
  clear: () => void;
};

export const useSavedStore = create<SavedStore>((set) => ({
  saved: [],
  isReady: false,
  isRefreshing: false,
  setSaved: (saved) => {
    set({ saved, isReady: true });
  },
  updateSaved: (updater) => {
    set((state) => ({ saved: updater(state.saved), isReady: true }));
  },
  setRefreshing: (value) => {
    set({ isRefreshing: value });
  },
  clear: () => {
    set({ saved: [], isReady: true });
  },
}));

export const useSavedStoreSnapshot = () =>
  useSavedStore(
    useShallow((state) => ({
      saved: state.saved,
      isReady: state.isReady,
      isRefreshing: state.isRefreshing,
      setSaved: state.setSaved,
      updateSaved: state.updateSaved,
      setRefreshing: state.setRefreshing,
      clear: state.clear,
    }))
  );

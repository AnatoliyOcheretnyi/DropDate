import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { apiRequest } from "../../../shared/api/client";
import { queryKeys } from "../../../shared/api/queryKeys";
import type { ListType } from "../../../shared/types/lists";
import type {
  Details,
  ReleaseInfo,
  Suggestion,
} from "../../../shared/types/release";
import { buildFallbackRelease } from "../../../shared/utils/release";
import { useToast } from "../../../shared/ui/Toast";
import { useSaved } from "./useSaved";

type DetailsPayload = {
  details: Details;
  release?: ReleaseInfo;
};

/**
 * Owns the "add this title to a list" flow: picker visibility, fetching the
 * release payload a brand-new title needs, and the confirmation toast with an
 * undo. Shared by home, collection and browse so the behaviour cannot drift.
 */
export function useListPicker() {
  const { getListTypes, setListTypes, findByTmdbId, isSuggestionSaved } =
    useSaved();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [pickerItem, setPickerItem] = useState<Suggestion | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  const openPicker = useCallback((item: Suggestion) => {
    setPickerItem(item);
    setPickerVisible(true);
  }, []);

  const closePicker = useCallback(() => setPickerVisible(false), []);

  const applyTo = useCallback(
    async (item: Suggestion, listTypes: ListType[]) => {
      const existing = findByTmdbId(item.id, item.mediaType);
      if (existing) {
        await setListTypes(item, listTypes, {
          release: existing,
          details: existing.details,
        });
        return true;
      }
      try {
        const payload = await queryClient.fetchQuery<DetailsPayload>({
          queryKey: queryKeys.details(item.mediaType, item.id),
          queryFn: () =>
            apiRequest<DetailsPayload>(
              `/details?tmdbId=${item.id}&mediaType=${item.mediaType}`,
            ),
          staleTime: 1000 * 60 * 10,
        });
        if (!payload.details) return false;
        const release =
          payload.release ||
          buildFallbackRelease(payload.details as Details, item.mediaType);
        if (!release) return false;
        await setListTypes(item, listTypes, {
          release,
          details: payload.details,
        });
        return true;
      } catch {
        return false;
      }
    },
    [findByTmdbId, queryClient, setListTypes],
  );

  const applyListTypes = useCallback(
    async (listTypes: ListType[]) => {
      const item = pickerItem;
      if (!item) return;
      const previous = getListTypes(item);
      const ok = await applyTo(item, listTypes);
      if (!ok) {
        showToast("Не вдалося оновити список");
        return;
      }
      if (listTypes.length === previous.length) return;
      showToast(
        listTypes.length > previous.length
          ? `«${item.title}» додано`
          : `«${item.title}» прибрано`,
        { label: "Скасувати", onPress: () => void applyTo(item, previous) },
      );
    },
    [applyTo, getListTypes, pickerItem, showToast],
  );

  return {
    pickerItem,
    pickerVisible,
    openPicker,
    closePicker,
    applyListTypes,
    getListTypes,
    isSaved: isSuggestionSaved,
  };
}

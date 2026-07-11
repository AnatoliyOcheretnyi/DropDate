import { useMemo, useState } from 'react';

import type { ListType } from '../../../shared/types/lists';
import { copy } from '../../../shared/strings';
import { useSaved, type SavedItem } from '../store/savedStore';

type Section = {
  id: string;
  title: string;
  items: SavedItem[];
};

export function useSavedScreen() {
  const { saved, removeRelease } = useSaved();
  const [activeList, setActiveList] = useState<ListType>('follow');

  const listItems = useMemo(
    () => saved.filter((item) => item.listTypes?.includes(activeList)),
    [activeList, saved]
  );

  const sections = useMemo<Section[]>(() => {
    const now = new Date();
    const endWeek = new Date();
    endWeek.setDate(endWeek.getDate() + 7);
    const endMonth = new Date();
    endMonth.setDate(endMonth.getDate() + 30);

    const buckets: Record<string, Section> = {
      today: { id: 'today', title: copy.saved.sectionTitles.today, items: [] },
      week: { id: 'week', title: copy.saved.sectionTitles.week, items: [] },
      month: { id: 'month', title: copy.saved.sectionTitles.month, items: [] },
      later: { id: 'later', title: copy.saved.sectionTitles.later, items: [] },
      ended: { id: 'ended', title: copy.saved.sectionTitles.ended, items: [] },
    };

    listItems.forEach((item) => {
      if (item.status !== 'upcoming' || !item.nextRelease) {
        buckets.ended.items.push(item);
        return;
      }
      const date = new Date(item.nextRelease);
      if (Number.isNaN(date.getTime())) {
        buckets.later.items.push(item);
        return;
      }
      if (date.toDateString() === now.toDateString()) {
        buckets.today.items.push(item);
        return;
      }
      if (date <= endWeek) {
        buckets.week.items.push(item);
        return;
      }
      if (date <= endMonth) {
        buckets.month.items.push(item);
        return;
      }
      buckets.later.items.push(item);
    });

    return Object.values(buckets).filter((section) => section.items.length > 0);
  }, [listItems]);

  const stats = useMemo(() => {
    const total = listItems.length;
    const seriesCount = listItems.filter((item) => item.mediaType === 'tv').length;

    if (activeList === 'follow') {
      const now = new Date();
      const endWeek = new Date();
      endWeek.setDate(endWeek.getDate() + 7);
      const thisWeek = listItems.filter((item) => {
        if (!item.nextRelease) return false;
        const date = new Date(item.nextRelease);
        return date >= now && date <= endWeek;
      }).length;
      return {
        left: { value: total, label: copy.listStats.total },
        middle: { value: thisWeek, label: copy.listStats.thisWeek, tone: 'warm' as const },
        right: { value: seriesCount, label: copy.listStats.series, tone: 'cool' as const },
      };
    }

    if (activeList === 'watchlist') {
      const watchedCount = listItems.reduce((acc, item) => acc + (item.watchCount ?? 0), 0);
      return {
        left: { value: total, label: copy.listStats.total },
        middle: { value: watchedCount, label: copy.listStats.watched, tone: 'warm' as const },
        right: { value: seriesCount, label: copy.listStats.series, tone: 'cool' as const },
      };
    }

    if (activeList === 'favorite') {
      const rewatches = listItems.reduce((acc, item) => {
        const count = item.watchCount ?? 0;
        return acc + Math.max(count - 1, 0);
      }, 0);
      return {
        left: { value: total, label: copy.listStats.total },
        middle: { value: rewatches, label: copy.listStats.rewatches, tone: 'warm' as const },
        right: { value: seriesCount, label: copy.listStats.series, tone: 'cool' as const },
      };
    }

    if (activeList === 'watched') {
      const views = listItems.reduce((acc, item) => acc + (item.watchCount ?? 0), 0);
      return {
        left: { value: total, label: copy.listStats.total },
        middle: { value: views, label: copy.listStats.views, tone: 'warm' as const },
        right: { value: seriesCount, label: copy.listStats.series, tone: 'cool' as const },
      };
    }

    const ratings = listItems
      .map((item) => item.userRating)
      .filter((value): value is number => typeof value === 'number');
    const avg =
      ratings.length > 0
        ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
        : 0;
    return {
      left: { value: total, label: copy.listStats.total },
      middle: { value: `${avg}`, label: copy.listStats.avgRating, tone: 'warm' as const },
      right: { value: seriesCount, label: copy.listStats.series, tone: 'cool' as const },
    };
  }, [activeList, listItems]);

  return {
    activeList,
    setActiveList,
    listItems,
    sections,
    stats,
    removeRelease,
  };
}

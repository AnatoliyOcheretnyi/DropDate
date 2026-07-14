"use client";

import { useMemo, useState } from "react";
import {
  ACHIEVEMENT_LIST_ICONS,
  ACHIEVEMENT_LIST_LABELS,
  ACHIEVEMENT_TIERS,
  getTierMeta,
  type AchievementListKey,
  type ListProgress,
} from "../../../shared/lib/achievements";

const SECONDARY_LISTS: AchievementListKey[] = [
  "watched",
  "favorite",
  "liked",
  "disliked",
  "watchlist",
  "follow",
];

const ALL_LADDERS: AchievementListKey[] = ["total", ...SECONDARY_LISTS];

const RING_RADIUS = 54;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const progressFraction = (count: number, from: number, to: number) => {
  if (to <= from) {
    return 1;
  }
  return Math.min(1, Math.max(0, (count - from) / (to - from)));
};

type Props = {
  lists: ListProgress[];
  isLoading: boolean;
};

export function AchievementsSection({ lists, isLoading }: Props) {
  const [selectedList, setSelectedList] = useState<AchievementListKey>("total");
  const [activeTier, setActiveTier] = useState<number | null>(null);
  const [viewAll, setViewAll] = useState(false);

  const byKey = useMemo(() => {
    const map = new Map<AchievementListKey, ListProgress>();
    lists.forEach((entry) => map.set(entry.listKey, entry));
    return map;
  }, [lists]);

  if (isLoading && lists.length === 0) {
    return (
      <div className="achievements-card achievements-card--loading" aria-hidden="true">
        <div className="achievements-ring" />
        <div className="achievements-card__body">
          <span className="achievements-skeleton-line" />
          <span className="achievements-skeleton-line" />
        </div>
      </div>
    );
  }

  const selectedProgress = byKey.get(selectedList);
  const selectedCount = selectedProgress?.count ?? 0;
  const selectedUnlocked = selectedProgress?.unlockedTiers ?? [];
  const currentTier = selectedUnlocked[selectedUnlocked.length - 1] ?? 0;
  const nextTier = selectedProgress?.nextTier ?? 0;
  const currentMeta = currentTier ? getTierMeta(selectedList, currentTier) : null;
  const nextMeta = nextTier ? getTierMeta(selectedList, nextTier) : null;
  const isTotal = selectedList === "total";

  const fraction = progressFraction(selectedCount, currentTier, nextTier || currentTier);
  const dashOffset = RING_CIRCUMFERENCE * (1 - fraction);

  const selectList = (key: AchievementListKey) => {
    setActiveTier(null);
    setSelectedList(key);
    setViewAll(false);
  };

  return (
    <div className="achievements">
      <div className="achievements-toolbar">
        <button
          type="button"
          className={`achievements-view-toggle${viewAll ? " is-active" : ""}`}
          onClick={() => setViewAll((prev) => !prev)}
        >
          {viewAll ? "← Один рівень" : "Показати всі списки"}
        </button>
      </div>

      {viewAll ? (
        <div className="achievements-all">
          {ALL_LADDERS.map((key) => {
            const entry = byKey.get(key);
            const count = entry?.count ?? 0;
            const unlockedTiers = entry?.unlockedTiers ?? [];
            const listCurrentTier = unlockedTiers[unlockedTiers.length - 1] ?? 0;
            const listNextTier = entry?.nextTier ?? 0;
            const meta = listCurrentTier ? getTierMeta(key, listCurrentTier) : null;
            const pct =
              progressFraction(count, listCurrentTier, listNextTier || listCurrentTier) * 100;

            return (
              <button
                key={key}
                type="button"
                className="achievements-all-row"
                onClick={() => selectList(key)}
              >
                <span className="achievements-all-row__icon" aria-hidden="true">
                  {meta?.icon ?? ACHIEVEMENT_LIST_ICONS[key]}
                </span>
                <div className="achievements-all-row__body">
                  <div className="achievements-all-row__head">
                    <strong>{key === "total" ? "Загальний рівень" : ACHIEVEMENT_LIST_LABELS[key]}</strong>
                    <span className="achievements-list-chip__count">
                      {count}
                      {listNextTier ? ` / ${listNextTier}` : ""}
                    </span>
                  </div>
                  <span className="achievements-all-row__tier">
                    {meta ? meta.name : "Ще не почав"}
                  </span>
                  <div className="achievements-list-chip__bar">
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <div className="achievements-all-row__badges">
                    {ACHIEVEMENT_TIERS.map((tier) => {
                      const unlocked = unlockedTiers.includes(tier);
                      const tierMeta = getTierMeta(key, tier);
                      return (
                        <span
                          key={tier}
                          className={`achievements-mini-badge${unlocked ? " is-unlocked" : ""}`}
                          title={`${tierMeta?.name ?? ""} (${tier}+)`}
                        >
                          {unlocked ? tierMeta?.icon ?? "🎬" : "🔒"}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <>
          <div className="achievements-card">
            <div className="achievements-ring">
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle className="achievements-ring__track" cx="60" cy="60" r={RING_RADIUS} />
                <circle
                  className="achievements-ring__fill"
                  cx="60"
                  cy="60"
                  r={RING_RADIUS}
                  style={{
                    strokeDasharray: RING_CIRCUMFERENCE,
                    strokeDashoffset: dashOffset,
                  }}
                />
              </svg>
              <div className="achievements-ring__center">
                <span className="achievements-ring__icon" aria-hidden="true">
                  {currentMeta?.icon ?? ACHIEVEMENT_LIST_ICONS[selectedList]}
                </span>
              </div>
            </div>
            <div className="achievements-card__body">
              {isTotal ? (
                <p className="achievements-card__kicker">Загальний рівень</p>
              ) : (
                <button
                  type="button"
                  className="achievements-card__kicker achievements-card__kicker--back"
                  onClick={() => selectList("total")}
                >
                  ← До загального рівня
                </button>
              )}
              <strong className="achievements-card__title">
                {isTotal ? "" : `${ACHIEVEMENT_LIST_LABELS[selectedList]}: `}
                {currentMeta ? currentMeta.name : "Ще не почав"}
              </strong>
              <p className="achievements-card__hint">
                {nextMeta
                  ? `${selectedCount} / ${nextTier} до «${nextMeta.name}» ${nextMeta.icon}`
                  : currentMeta
                    ? "Усі рівні розблоковано 🎉"
                    : isTotal
                      ? "Онови статус на «Улюблене», «Сподобалось» чи «Переглянуто» для першого фільму"
                      : `Додай перший тайтл у «${ACHIEVEMENT_LIST_LABELS[selectedList]}»`}
              </p>
            </div>
          </div>

          <div
            className="achievements-badges"
            aria-label={`Рівні: ${ACHIEVEMENT_LIST_LABELS[selectedList] ?? "Загальний"}`}
          >
            {ACHIEVEMENT_TIERS.map((tier) => {
              const unlocked = selectedUnlocked.includes(tier);
              const meta = getTierMeta(selectedList, tier);
              const isActive = activeTier === tier;
              return (
                <button
                  key={tier}
                  type="button"
                  className={`achievements-badge${unlocked ? " is-unlocked" : ""}${
                    isActive ? " is-active" : ""
                  }`}
                  aria-expanded={isActive}
                  onClick={() => setActiveTier((prev) => (prev === tier ? null : tier))}
                >
                  <span className="achievements-badge__icon" aria-hidden="true">
                    {unlocked ? meta?.icon ?? "🎬" : "🔒"}
                  </span>
                  {isActive ? (
                    <span className="achievements-badge__tooltip">
                      <strong>{meta?.name ?? "?"}</strong>
                      <span>
                        {tier}+{" "}
                        {isTotal ? "у статус-списках" : `у «${ACHIEVEMENT_LIST_LABELS[selectedList]}»`}
                      </span>
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="achievements-lists">
            {SECONDARY_LISTS.map((key) => {
              const entry = byKey.get(key);
              const count = entry?.count ?? 0;
              const unlockedTiers = entry?.unlockedTiers ?? [];
              const currentListTier = unlockedTiers[unlockedTiers.length - 1] ?? 0;
              const nextListTier = entry?.nextTier ?? 0;
              const meta = currentListTier ? getTierMeta(key, currentListTier) : null;
              const pct =
                progressFraction(count, currentListTier, nextListTier || currentListTier) * 100;

              return (
                <button
                  key={key}
                  type="button"
                  className={`achievements-list-chip${
                    selectedList === key ? " is-selected" : ""
                  }`}
                  aria-pressed={selectedList === key}
                  onClick={() => selectList(key)}
                >
                  <span className="achievements-list-chip__icon" aria-hidden="true">
                    {meta?.icon ?? ACHIEVEMENT_LIST_ICONS[key]}
                  </span>
                  <div className="achievements-list-chip__body">
                    <div className="achievements-list-chip__head">
                      <span>{ACHIEVEMENT_LIST_LABELS[key]}</span>
                      <span className="achievements-list-chip__count">
                        {count}
                        {nextListTier ? ` / ${nextListTier}` : ""}
                      </span>
                    </div>
                    <div className="achievements-list-chip__bar">
                      <span style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

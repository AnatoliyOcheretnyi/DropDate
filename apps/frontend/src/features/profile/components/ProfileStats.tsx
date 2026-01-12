"use client";

import type { ProfileStat } from "../types";

type Props = {
  total: number;
  middleStat: ProfileStat;
  seriesCount: number;
  statsCopy: {
    total: string;
    series: string;
  };
};

export function ProfileStats({ total, middleStat, seriesCount, statsCopy }: Props) {
  return (
    <div className="profile-stats">
      <div className="profile-stat-card tone-green">
        <strong>{total}</strong>
        <span>{statsCopy.total}</span>
      </div>
      <div className={`profile-stat-card tone-${middleStat.tone}`}>
        <strong>{middleStat.value}</strong>
        <span>{middleStat.label}</span>
      </div>
      <div className="profile-stat-card tone-blue">
        <strong>{seriesCount}</strong>
        <span>{statsCopy.series}</span>
      </div>
    </div>
  );
}

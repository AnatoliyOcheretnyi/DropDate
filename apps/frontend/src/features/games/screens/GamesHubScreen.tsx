"use client";

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Reveal } from "../../../shared/ui/Reveal";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { GameShell } from "../components/GameShell";
import { useAllGameStats } from "../hooks/useGameStats";

type HubCard = {
  id: string;
  href: string;
  emoji: string;
  title: string;
  description: string;
  accentA: string;
  accentB: string;
  /** Stats key in localStorage; cards without scores (wheel) omit it. */
  statsKey?: string;
  statUnit?: string;
};

const CARDS: HubCard[] = [
  {
    id: "battle_release_date",
    href: "/games/battle?mode=release_date",
    emoji: "🎬",
    title: "Що вийшло раніше?",
    description: "Класичний баттл двох фільмів за датою виходу",
    accentA: "rgba(115, 240, 193, 0.35)",
    accentB: "rgba(21, 68, 52, 0.5)",
    statsKey: "battle_release_date",
    statUnit: "/10",
  },
  {
    id: "battle_rating",
    href: "/games/battle?mode=rating",
    emoji: "⭐",
    title: "У кого рейтинг вищий?",
    description: "Порівняй оцінки TMDB двох фільмів",
    accentA: "rgba(115, 170, 240, 0.35)",
    accentB: "rgba(24, 44, 84, 0.5)",
    statsKey: "battle_rating",
    statUnit: "/10",
  },
  {
    id: "streak",
    href: "/games/battle?mode=release_date&endless=1",
    emoji: "🔥",
    title: "Стрік",
    description: "Одне життя. Грай, поки не помилишся",
    accentA: "rgba(240, 150, 115, 0.35)",
    accentB: "rgba(84, 40, 24, 0.5)",
    statsKey: "streak",
  },
  {
    id: "blitz",
    href: "/games/blitz",
    emoji: "🖼️",
    title: "Постер-бліц",
    description: "Вгадай фільм за кадром, поки тікає таймер",
    accentA: "rgba(240, 115, 162, 0.35)",
    accentB: "rgba(84, 24, 48, 0.5)",
    statsKey: "blitz",
    statUnit: "/10",
  },
  {
    id: "timeline",
    href: "/games/timeline",
    emoji: "🕰️",
    title: "Хронологія",
    description: "Розстав фільми в порядку виходу",
    accentA: "rgba(195, 240, 115, 0.35)",
    accentB: "rgba(60, 84, 24, 0.5)",
    statsKey: "timeline",
    statUnit: "/5",
  },
  {
    id: "year",
    href: "/games/year",
    emoji: "📅",
    title: "Вгадай рік",
    description: "Наскільки точно ти відчуваєш епохи кіно?",
    accentA: "rgba(255, 212, 121, 0.35)",
    accentB: "rgba(84, 64, 24, 0.5)",
    statsKey: "year",
    statUnit: " очок",
  },
  {
    id: "wheel",
    href: "/games/wheel",
    emoji: "🎡",
    title: "Колесо вечора",
    description: "Крутни — і колесо обере, що дивитись сьогодні",
    accentA: "rgba(160, 115, 240, 0.35)",
    accentB: "rgba(48, 24, 84, 0.5)",
  },
  {
    id: "friend_taste",
    href: "/games/friend-taste",
    emoji: "👥",
    title: "Смак друга",
    description: "Вгадай, які фільми твій друг оцінив вище",
    accentA: "rgba(115, 240, 231, 0.35)",
    accentB: "rgba(24, 76, 84, 0.5)",
    statsKey: "friend_taste",
    statUnit: "/10",
  },
];

// The daily challenge rotates across seedable games by UTC day, so every
// player lands on the same game with the same backend-seeded questions.
const DAILY_ROTATION = [
  { label: "Кіно-баттл: дати", href: "/games/battle?mode=release_date&daily=1" },
  { label: "Постер-бліц", href: "/games/blitz?daily=1" },
  { label: "Кіно-баттл: рейтинги", href: "/games/battle?mode=rating&daily=1" },
  { label: "Вгадай рік", href: "/games/year?daily=1" },
];

const dailyOfToday = () => {
  const now = new Date();
  const utcDay = Math.floor(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000);
  return DAILY_ROTATION[utcDay % DAILY_ROTATION.length];
};

const dailyDateLabel = () =>
  new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long" }).format(new Date());

export function GamesHubScreen() {
  const router = useRouter();
  const stats = useAllGameStats();
  const { saved } = useSavedReleases();
  const watchlistCount = saved.filter((item) =>
    (item.listTypes ?? []).includes("watchlist")
  ).length;
  const daily = dailyOfToday();

  return (
    <GameShell withBack={false}>
      <div className="games-head">
        <p className="eyebrow">Міні-ігри</p>
        <h1>Ігрова зала</h1>
        <p className="games-lead">
          Швидкі кіноігри: вгадуй, порівнюй, розставляй — і додавай знахідки у
          свій список прямо під час гри.
        </p>
      </div>

      <Reveal>
        <button
          type="button"
          className="games-daily"
          onClick={() => router.push(daily.href)}
        >
          <span className="games-daily__badge">Щоденний виклик</span>
          <span className="games-daily__title">
            {daily.label} · {dailyDateLabel()}
          </span>
          <span className="games-daily__hint">
            Однакові питання для всіх. Зіграй і поділись результатом →
          </span>
        </button>
      </Reveal>

      <div className="games-hub-grid">
        {CARDS.map((card, index) => {
          const stat = card.statsKey ? stats[card.statsKey] : undefined;
          return (
            <Reveal key={card.id} delay={index * 60}>
              <button
                type="button"
                className="games-hub-card"
                style={{ "--ga": card.accentA, "--gb": card.accentB } as CSSProperties}
                onClick={() => router.push(card.href)}
              >
                <span className="games-hub-card__emoji" aria-hidden="true">
                  {card.emoji}
                </span>
                <strong>{card.title}</strong>
                <span className="games-hub-card__desc">{card.description}</span>
                <span className="games-hub-card__meta">
                  {card.id === "wheel" ? (
                    watchlistCount > 0 ? (
                      <>У колі: {watchlistCount} зі списку «Хочу подивитись»</>
                    ) : (
                      <>Наповни список «Хочу подивитись» — або крути трендове</>
                    )
                  ) : stat && stat.plays > 0 ? (
                    <>
                      Рекорд: {card.id === "streak" ? stat.bestStreak : stat.bestScore}
                      {card.statUnit ?? ""} · Ігор: {stat.plays}
                    </>
                  ) : (
                    <>Ще не грав — саме час →</>
                  )}
                </span>
                <span className="games-hub-card__cta">Грати →</span>
              </button>
            </Reveal>
          );
        })}
      </div>
    </GameShell>
  );
}

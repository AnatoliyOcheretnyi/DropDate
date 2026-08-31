"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Reveal } from "../../../shared/ui/Reveal";
import { useAuth } from "../../../shared/state/auth";
import { useFriends } from "../../friends/hooks/useFriends";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { StatRow } from "../../profile/components/StatRow";
import { GameShell } from "../components/GameShell";
import { GameHubCard } from "../components/GameHubCard";
import { DailyBanner } from "../components/DailyBanner";
import { DuelPanel, type IncomingChallenge } from "../components/DuelPanel";
import { GameLeaderboard, type LeaderRow } from "../components/GameLeaderboard";
import { useAllGameStats } from "../hooks/useGameStats";
import { useGamePosters } from "../hooks/useGamePosters";

type HubCard = {
  id: string;
  href: string;
  emoji: string;
  title: string;
  description: string;
  accentA: string;
  /** Stats key in localStorage; cards without scores (wheel) omit it. */
  statsKey?: string;
  statUnit?: string;
};

const CARDS: HubCard[] = [
  {
    id: "people",
    href: "/games/people",
    emoji: "🎭",
    title: "Люди кіно",
    description: "Поєднуй акторів і режисерів з фільмами та змінюй напрям гри",
    accentA: "rgba(204, 154, 255, 0.35)",
    statsKey: "people",
    statUnit: "/10",
  },
  {
    id: "akinator",
    href: "/games/akinator",
    emoji: "🔮",
    title: "Кіноакінатор",
    description: "Задумай фільм — я спробую вгадати його за 20 питань",
    accentA: "rgba(255, 190, 92, 0.38)",
  },
  {
    id: "battle_release_date",
    href: "/games/battle?mode=release_date",
    emoji: "🎬",
    title: "Що вийшло раніше?",
    description: "Класичний баттл двох фільмів за датою виходу",
    accentA: "rgba(115, 240, 193, 0.35)",
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
    statsKey: "battle_rating",
    statUnit: "/10",
  },
  {
    id: "blitz",
    href: "/games/blitz",
    emoji: "🖼️",
    title: "Постер-бліц",
    description: "Вгадай фільм за кадром, поки тікає таймер",
    accentA: "rgba(240, 115, 162, 0.35)",
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
  },
  {
    id: "friend_taste",
    href: "/games/friend-taste",
    emoji: "👥",
    title: "Смак друга",
    description: "Вгадай, які фільми твій друг оцінив вище",
    accentA: "rgba(115, 240, 231, 0.35)",
    statsKey: "friend_taste",
    statUnit: "/10",
  },
];

// The daily challenge rotates across seedable games by UTC day, so every
// player lands on the same game with the same backend-seeded questions.
const DAILY_ROTATION = [
  { label: "Кіно-баттл: дати", href: "/games/battle?mode=release_date&daily=1", statsKey: "battle_release_date" },
  { label: "Постер-бліц", href: "/games/blitz?daily=1", statsKey: "blitz" },
  { label: "Кіно-баттл: рейтинги", href: "/games/battle?mode=rating&daily=1", statsKey: "battle_rating" },
  { label: "Вгадай рік", href: "/games/year?daily=1", statsKey: "year" },
];

const dailyOfToday = () => {
  const now = new Date();
  const utcDay = Math.floor(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 86400000
  );
  return DAILY_ROTATION[utcDay % DAILY_ROTATION.length];
};

const dailyDateLabel = () =>
  new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long" }).format(new Date());

const isToday = (value?: string) => {
  if (!value) {
    return false;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return false;
  }
  const now = new Date();
  return (
    parsed.getFullYear() === now.getFullYear() &&
    parsed.getMonth() === now.getMonth() &&
    parsed.getDate() === now.getDate()
  );
};

export function GamesHubScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const stats = useAllGameStats();
  const { accessToken, user } = useAuth();
  const { friends } = useFriends();
  const { saved } = useSavedReleases();
  const { backdrop, sliceFor } = useGamePosters();
  const [challengeLink, setChallengeLink] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const isAuthed = Boolean(user && accessToken);

  const challenges = useQuery({
    queryKey: ["game-challenges", user?.id],
    enabled: isAuthed,
    queryFn: async () => {
      const response = await fetch("/api/games/challenges", {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const payload = (await response.json()) as {
        items?: Array<{
          id: string;
          creatorId: string;
          creatorName?: string;
          opponentId: string;
          gameId: string;
          seed: number;
          opponentScore?: number | null;
        }> | null;
      };
      return Array.isArray(payload.items) ? payload.items : [];
    },
  });

  const progress = useQuery({
    queryKey: ["game-progress-summary", user?.id],
    enabled: isAuthed,
    queryFn: async () => {
      const response = await fetch("/api/games/stats", {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const payload = (await response.json()) as {
        dailyStreak?: number | null;
        achievements?: string[] | null;
      };
      return {
        dailyStreak: typeof payload.dailyStreak === "number" ? payload.dailyStreak : 0,
        achievements: Array.isArray(payload.achievements) ? payload.achievements : [],
      };
    },
  });

  const leaders = useQuery({
    queryKey: ["game-leaderboard", user?.id],
    enabled: isAuthed,
    queryFn: async () => {
      const response = await fetch("/api/games/leaderboard", {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const payload = (await response.json()) as {
        items?: LeaderRow[] | null;
      };
      return Array.isArray(payload.items) ? payload.items : [];
    },
  });

  const watchlistCount = saved.filter((item) =>
    (item.listTypes ?? []).includes("watchlist")
  ).length;

  const daily = dailyOfToday();
  const dailyStats = stats[daily.statsKey];
  const playedToday = isToday(dailyStats?.lastPlayedAt);

  const totals = useMemo(() => {
    const entries = Object.values(stats);
    return {
      plays: entries.reduce((sum, entry) => sum + entry.plays, 0),
      best: entries.reduce((max, entry) => Math.max(max, entry.bestScore), 0),
    };
  }, [stats]);

  const myPlace = useMemo(() => {
    const index = (leaders.data ?? []).findIndex((row) => row.userId === user?.id);
    return index >= 0 ? `№${index + 1}` : "—";
  }, [leaders.data, user?.id]);

  const incoming: IncomingChallenge[] = useMemo(
    () =>
      (challenges.data ?? [])
        .filter((item) => item.opponentId === user?.id && item.opponentScore == null)
        .map((item) => ({
          id: item.id,
          gameId: item.gameId,
          seed: item.seed,
          fromLabel:
            item.creatorName ||
            friends.find((entry) => entry.user.id === item.creatorId)?.user.username ||
            "друг",
        })),
    [challenges.data, friends, user?.id]
  );

  const handleCreateChallenge = useCallback(
    async (opponentId: string, gameId: string) => {
      if (!accessToken) {
        return;
      }
      setIsCreating(true);
      try {
        const response = await fetch("/api/games/challenges", {
          method: "POST",
          headers: {
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({ opponentId, gameId }),
        });
        const payload = (await response.json()) as { id?: string; seed?: number };
        if (response.ok && payload.id) {
          setChallengeLink(
            `/games/battle?mode=${gameId}&challenge=${payload.id}&seed=${payload.seed}`
          );
          void queryClient.invalidateQueries({ queryKey: ["game-challenges", user?.id] });
        }
      } finally {
        setIsCreating(false);
      }
    },
    [accessToken, queryClient, user?.id]
  );

  const statTiles = [
    { key: "streak", value: progress.data?.dailyStreak ?? 0, label: "днів поспіль" },
    { key: "plays", value: totals.plays, label: "ігор зіграно" },
    { key: "best", value: totals.best, label: "найкращий рахунок" },
    {
      key: "achievements",
      value: progress.data?.achievements.length ?? 0,
      label: "ігрових досягнень",
    },
    { key: "place", value: myPlace, label: "місце в топі" },
  ];

  return (
    <GameShell withBack={false}>
      <div className="games-head games-head--tight">
        <p className="eyebrow">Міні-ігри</p>
        <h1>Ігрова зала</h1>
        <p className="games-lead">
          Швидкі кіноігри: вгадуй, порівнюй, розставляй — і додавай знахідки у
          свій список прямо під час гри.
        </p>
      </div>

      <Reveal>
        <DailyBanner
          label={daily.label}
          dateLabel={dailyDateLabel()}
          backdrop={backdrop}
          playedScore={
            playedToday && dailyStats ? `${dailyStats.bestScore}` : undefined
          }
          onPlay={() => router.push(daily.href)}
        />
      </Reveal>

      {isAuthed ? (
        <StatRow items={statTiles} isLoading={progress.isLoading} />
      ) : (
        <p className="games-guest-strip">
          Увійди, щоб зберігати рекорди, стріки й місце в топі.
        </p>
      )}

      <div className="games-grid-head">
        <div>
          <h2>Усі ігри</h2>
          <p>Фон картки — постери з тієї ж вибірки, яку гра використовує всередині</p>
        </div>
        <span>{CARDS.length} ігор</span>
      </div>

      <div className="games-hub-grid">
        {CARDS.map((card, index) => {
          const stat = card.statsKey ? stats[card.statsKey] : undefined;
          const hasRecord = Boolean(stat && stat.plays > 0);
          const meta =
            card.id === "wheel"
              ? watchlistCount > 0
                ? `У колі: ${watchlistCount}`
                : "Крутимо трендове"
              : hasRecord
                ? `Рекорд ${stat!.bestScore}${card.statUnit ?? ""}`
                : "Ще не грав";
          return (
            <Reveal key={card.id} delay={index * 60}>
              <GameHubCard
                emoji={card.emoji}
                title={card.title}
                description={card.description}
                meta={meta}
                isRecord={hasRecord}
                accentA={card.accentA}
                posters={sliceFor(index)}
                onClick={() => router.push(card.href)}
              />
            </Reveal>
          );
        })}
      </div>

      {isAuthed && friends.length > 0 ? (
        <Reveal>
          <DuelPanel
            friends={friends}
            incoming={incoming}
            isCreating={isCreating}
            createdLink={challengeLink}
            onCreate={(opponentId, gameId) => void handleCreateChallenge(opponentId, gameId)}
            onOpen={(href) => router.push(href)}
          />
        </Reveal>
      ) : null}

      {isAuthed ? (
        <GameLeaderboard
          rows={leaders.data ?? []}
          currentUserId={user?.id}
          isLoading={leaders.isLoading}
        />
      ) : null}
    </GameShell>
  );
}

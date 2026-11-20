import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { FeatureScreen } from "../../../shared/ui/FeatureScreen";
import { MotionPressable } from "../../../shared/ui/MotionPressable";
import { ScreenState } from "../../../shared/ui/ScreenState";
import { queryKeys } from "../../../shared/api/queryKeys";
import { useTheme } from "../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../shared/theme/palette";
import {
  getGameQuestions,
  recordGameResult,
  submitChallenge,
  type GameMode,
  type GameQuestion,
  type GameTitle,
} from "../api/games";
import { GameDashboard } from "./GameDashboard";
import { ChallengeInbox } from "./ChallengeInbox";
import { DailyBanner } from "./components/DailyBanner";
import { GameHubCard } from "./components/GameHubCard";
import { GameAction, GameFeedback, GameShell } from "./components/GameShell";
import { GameResult } from "./components/GameResult";
import { useAuthStore } from "../../auth/store/authStore";
import { useSaved } from "../../saved/hooks/useSaved";

type Format = "rounds" | "survival";
type GameConfig = {
  mode: GameMode;
  emoji: string;
  title: string;
  description: string;
};
const TINTS: Record<string, string> = {
  release_date: "rgba(84,255,182,0.42)",
  rating: "rgba(115,170,240,0.42)",
  poster: "rgba(240,115,162,0.42)",
  timeline: "rgba(195,240,115,0.42)",
  year: "rgba(255,212,121,0.42)",
  movie_actor: "rgba(204,154,255,0.42)",
  actor_movie: "rgba(204,154,255,0.42)",
  movie_director: "rgba(160,115,240,0.42)",
  director_movie: "rgba(160,115,240,0.42)",
  wheel: "rgba(160,115,240,0.42)",
  friend_taste: "rgba(115,240,231,0.42)",
  akinator: "rgba(255,190,92,0.42)",
};

const games: GameConfig[] = [
  {
    mode: "release_date",
    emoji: "🎬",
    title: "Що вийшло раніше?",
    description: "Порівнюй дати релізів",
  },
  {
    mode: "rating",
    emoji: "⭐",
    title: "Вищий рейтинг",
    description: "Відчуй оцінки глядачів",
  },
  {
    mode: "poster",
    emoji: "🖼️",
    title: "Постер-бліц",
    description: "Вгадай тайтл за кадром",
  },
  {
    mode: "timeline",
    emoji: "🕰️",
    title: "Хронологія",
    description: "Розстав фільми за роками",
  },
  {
    mode: "year",
    emoji: "📅",
    title: "Вгадай рік",
    description: "Наскільки точно відчуваєш епоху?",
  },
  {
    mode: "movie_actor",
    emoji: "🎭",
    title: "Актор у фільмі",
    description: "Хто грав у цьому фільмі?",
  },
  {
    mode: "actor_movie",
    emoji: "👤",
    title: "Фільм актора",
    description: "Де знімалась ця людина?",
  },
  {
    mode: "movie_director",
    emoji: "🎥",
    title: "Режисер фільму",
    description: "Хто стояв за камерою?",
  },
  {
    mode: "director_movie",
    emoji: "🎞️",
    title: "Фільм режисера",
    description: "Знайди роботу режисера",
  },
];
const fixedModes = new Set<GameMode>(["timeline", "year"]);

type HubItem = {
  key: string;
  emoji: string;
  title: string;
  description: string;
  tint: string;
  onPress: () => void;
};

/**
 * Grouped by what the game asks of the player rather than by when it was
 * built, so the hall has an order you can learn instead of twelve equal rows.
 */
const HUB_GROUPS: {
  id: string;
  title: string;
  hint: string;
  keys: string[];
}[] = [
  {
    id: "duels",
    title: "Дуелі",
    hint: "Два тайтли — обери правильний",
    keys: ["release_date", "rating"],
  },
  {
    id: "recognition",
    title: "Впізнавання",
    hint: "Постери, актори, режисери",
    keys: [
      "poster",
      "movie_actor",
      "actor_movie",
      "movie_director",
      "director_movie",
    ],
  },
  {
    id: "precision",
    title: "Точність",
    hint: "Роки й хронологія",
    keys: ["year", "timeline"],
  },
  {
    id: "extras",
    title: "Розваги",
    hint: "Без рахунку — просто на вечір",
    keys: ["wheel", "friend_taste", "akinator"],
  },
];
export function GamesScreen() {
  const params = useLocalSearchParams<{
    challengeId?: string;
    mode?: GameMode;
  }>();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [mode, setMode] = useState<GameMode | null>(
    params.challengeId && params.mode ? params.mode : null,
  );
  const [format, setFormat] = useState<Format | null>(
    params.challengeId ? "rounds" : null,
  );
  const [daily, setDaily] = useState(false);
  // Posters come from the player's own library, so the hub shows the pool the
  // games actually draw on. Empty library just leaves the tint.
  const { saved } = useSaved();
  const posters = useMemo(
    () =>
      saved
        .map((item) => item.posterUrl)
        .filter((url): url is string => Boolean(url)),
    [saved],
  );

  const dailyRotation: GameMode[] = ["release_date", "poster", "rating"];
  const dailyMode =
    dailyRotation[Math.floor(Date.now() / 86400000) % dailyRotation.length];
  const dailyLabel =
    games.find((game) => game.mode === dailyMode)?.title ?? "Кіногра";
  const dailyDate = new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
  }).format(new Date());

  const extras = [
    {
      key: "wheel",
      href: "/games/wheel",
      emoji: "🎡",
      title: "Колесо вечора",
      description: "Обери випадковий тайтл",
    },
    {
      key: "friend_taste",
      href: "/games/friend-taste",
      emoji: "👥",
      title: "Смак друга",
      description: "Вгадай оцінки друга",
    },
    {
      key: "akinator",
      href: "/games/akinator",
      emoji: "🔮",
      title: "Кіноакінатор",
      description: "Задумай фільм — ми вгадаємо",
    },
  ];
  const hubItems: HubItem[] = [
    ...games.map((game) => ({
      key: game.mode as string,
      emoji: game.emoji,
      title: game.title,
      description: game.description,
      tint: TINTS[game.mode] ?? "rgba(84,255,182,0.42)",
      onPress: () => {
        setDaily(false);
        setMode(game.mode);
        if (fixedModes.has(game.mode)) setFormat("rounds");
      },
    })),
    ...extras.map((item) => ({
      key: item.key,
      emoji: item.emoji,
      title: item.title,
      description: item.description,
      tint: TINTS[item.key] ?? "rgba(84,255,182,0.42)",
      onPress: () => router.push(item.href as Href),
    })),
  ];
  const byKey = new Map(hubItems.map((item) => [item.key, item]));

  if (!mode)
    return (
      <FeatureScreen
        asTab
        title="Ігрова зала"
        subtitle="Короткі сесії на кіноінтуїцію."
      >
        <GameDashboard />
        <ChallengeInbox />
        <DailyBanner
          label={dailyLabel}
          dateLabel={dailyDate}
          image={posters[0]}
          onPress={() => {
            setDaily(true);
            setMode(dailyMode);
            setFormat("rounds");
          }}
        />
        {/* Twelve identical rows read as a list of files. Grouped by what the
            game actually asks of you, the hall reads as a hall. */}
        {HUB_GROUPS.map((group) => {
          const items = group.keys
            .map((key) => byKey.get(key))
            .filter((item): item is HubItem => Boolean(item));
          if (!items.length) return null;
          return (
            <View key={group.id} style={styles.group}>
              <View style={styles.groupHead}>
                <Text style={styles.groupTitle}>{group.title}</Text>
                <Text style={styles.groupHint}>{group.hint}</Text>
              </View>
              <View style={styles.hub}>
                {items.map((item, index) => (
                  <GameHubCard
                    key={item.key}
                    emoji={item.emoji}
                    title={item.title}
                    description={item.description}
                    tint={item.tint}
                    posters={posters.slice(index * 2, index * 2 + 2)}
                    onPress={item.onPress}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </FeatureScreen>
    );
  if (!format)
    return (
      <FeatureScreen
        title={games.find((x) => x.mode === mode)?.title ?? "Кіногра"}
        subtitle="Обери темп сесії."
        // A step inside the games tab, not a route: the arrow goes back to the
        // hall rather than popping the player out of the tab entirely.
        onBack={() => setMode(null)}
      >
        <MotionPressable
          style={styles.formatCard}
          onPress={() => setFormat("rounds")}
        >
          <View style={styles.formatIcon}>
            <Ionicons name="timer-outline" size={24} color={colors.accent} />
          </View>
          <View style={styles.grow}>
            <Text style={styles.hubTitle}>10 раундів</Text>
            <Text style={styles.muted}>Швидка сесія без життів</Text>
            <Text style={styles.formatMeta}>≈ 2 хвилини</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </MotionPressable>
        <MotionPressable
          style={styles.formatCard}
          onPress={() => setFormat("survival")}
        >
          <View style={styles.formatIcon}>
            <Ionicons name="heart-outline" size={24} color={colors.error} />
          </View>
          <View style={styles.grow}>
            <Text style={styles.hubTitle}>До поразки</Text>
            <Text style={styles.muted}>Три життя, грай якомога довше</Text>
            <Text style={styles.formatMeta}>Поки не скінчаться серця</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
        </MotionPressable>
      </FeatureScreen>
    );
  if (mode === "year")
    return (
      <YearSession
        onExit={() => {
          setMode(null);
          setFormat(null);
        }}
      />
    );
  if (mode === "timeline")
    return (
      <TimelineSession
        onExit={() => {
          setMode(null);
          setFormat(null);
        }}
      />
    );
  return (
    <Session
      mode={mode}
      format={format}
      daily={daily}
      challengeId={params.challengeId}
      onExit={() => {
        setFormat(null);
        setMode(null);
        setDaily(false);
      }}
    />
  );
}
function Session({
  mode,
  format,
  daily,
  challengeId,
  onExit,
}: {
  mode: GameMode;
  format: Format;
  daily: boolean;
  challengeId?: string;
  onExit: () => void;
}) {
  const router = useRouter();
  const authed = useAuthStore((state) => Boolean(state.user));
  const recorded = useRef(false);
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const count = format === "survival" ? 20 : 10;
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(0);
  const [lives, setLives] = useState(format === "survival" ? 3 : 0);
  const [selected, setSelected] = useState<string | null>(null);
  const query = useQuery({
    queryKey: queryKeys.gameQuestions(
      `${mode}:${daily ? "daily" : "regular"}`,
      count,
    ),
    queryFn: ({ signal }) => getGameQuestions(mode, count, signal, daily),
  });
  const q = query.data?.[index];
  const finished =
    !query.isLoading && (!q || (format === "survival" && lives <= 0));
  const correctId = answerId(q);
  const choose = (id: string) => {
    if (selected || !q) return;
    setSelected(id);
    // The answer lands in the hand before it lands on screen.
    void Haptics.notificationAsync(
      id === correctId
        ? Haptics.NotificationFeedbackType.Success
        : Haptics.NotificationFeedbackType.Error,
    );
    if (id === correctId) {
      setScore((v) => v + 1);
      setStreak((v) => {
        setBest((b) => Math.max(b, v + 1));
        return v + 1;
      });
    } else {
      setStreak(0);
      if (format === "survival") setLives((v) => v - 1);
    }
  };
  const next = () => {
    setSelected(null);
    setIndex((v) => v + 1);
  };
  const restart = () => {
    setIndex(0);
    setScore(0);
    setStreak(0);
    setBest(0);
    setLives(format === "survival" ? 3 : 0);
    setSelected(null);
    recorded.current = false;
    void query.refetch();
  };
  useEffect(() => {
    if (finished && authed && query.data?.length && !recorded.current) {
      recorded.current = true;
      void recordGameResult(mode, score, best, daily).catch(() => undefined);
      if (challengeId)
        void submitChallenge(challengeId, score).catch(() => undefined);
    }
  }, [
    authed,
    best,
    challengeId,
    daily,
    finished,
    mode,
    query.data?.length,
    score,
  ]);
  if (query.isLoading) return <ScreenState loading title="Готуємо запитання" />;
  if (query.isError)
    return (
      <ScreenState
        title="Гра недоступна"
        message={query.error.message}
        onRetry={() => void query.refetch()}
      />
    );
  if (finished)
    return (
      <GameResult
        eyebrow={daily ? "Щоденний виклик" : (gameTitle(mode) ?? "Кіногра")}
        score={score}
        caption={
          format === "survival"
            ? "правильних до поразки"
            : `з ${query.data?.length ?? 10} правильних`
        }
        stats={[
          { label: "найкраща серія", value: String(best) },
          {
            label: format === "survival" ? "формат" : "раундів",
            value:
              format === "survival"
                ? "до поразки"
                : String(query.data?.length ?? 10),
          },
        ]}
        onRestart={restart}
        onExit={onExit}
      />
    );
  if (!q) return null;
  const total = format === "rounds" ? query.data?.length : undefined;
  return (
    <GameShell
      eyebrow={daily ? "Щоденний виклик" : (gameTitle(mode) ?? "Кіногра")}
      question={q.prompt}
      round={{ index, total }}
      score={score}
      streak={streak}
      lives={format === "survival" ? Math.max(lives, 0) : null}
      onExit={onExit}
      footer={
        selected ? (
          <>
            <GameFeedback
              correct={selected === correctId}
              text={selected === correctId ? "Правильно!" : "Не цього разу"}
            />
            <GameAction
              label={
                index + 1 >= (query.data?.length ?? 0)
                  ? "Результат"
                  : "Наступний раунд"
              }
              onPress={next}
            />
          </>
        ) : (
          <Text style={styles.hint}>Обери відповідь</Text>
        )
      }
    >
      <Question
        question={q}
        selected={selected}
        correctId={correctId}
        onChoose={choose}
      />
      {selected && q.card ? (
        <MotionPressable
          style={styles.details}
          onPress={() =>
            router.push(`/title/${q.card!.mediaType}/${q.card!.tmdbId}` as Href)
          }
        >
          <Ionicons
            name="information-circle-outline"
            size={17}
            color={colors.text}
          />
          <Text style={styles.detailsText} numberOfLines={1}>
            Відкрити {q.card.title}
          </Text>
        </MotionPressable>
      ) : null}
    </GameShell>
  );
}
function YearSession({ onExit }: { onExit: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState(2000);
  const [revealed, setRevealed] = useState(false);
  const [points, setPoints] = useState(0);
  const query = useQuery({
    queryKey: queryKeys.gameQuestions("year", 8),
    queryFn: ({ signal }) => getGameQuestions("year", 8, signal),
  });
  const q = query.data?.[index];
  const restart = () => {
    setIndex(0);
    setPoints(0);
    setGuess(2000);
    setRevealed(false);
    void query.refetch();
  };
  if (query.isLoading)
    return <ScreenState loading title="Перемотуємо плівку" />;
  if (!q?.card)
    return (
      <GameResult
        eyebrow="Вгадай рік"
        score={points}
        caption="очок за точність"
        onRestart={restart}
        onExit={onExit}
      />
    );
  const actual = Number((q.card.releaseDate ?? q.card.year ?? "").slice(0, 4));
  const diff = Math.abs(guess - actual);
  const earned = diff === 0 ? 50 : Math.max(0, 30 - diff * 3);
  return (
    <GameShell
      eyebrow="Вгадай рік"
      question="У якому році це вийшло?"
      round={{ index, total: query.data?.length }}
      score={points}
      onExit={onExit}
      footer={
        revealed ? (
          <>
            <GameFeedback
              correct={diff <= 2}
              text={`Правильно: ${actual} · +${earned}`}
            />
            <GameAction
              label="Далі"
              onPress={() => {
                setIndex((v) => v + 1);
                setGuess(2000);
                setRevealed(false);
              }}
            />
          </>
        ) : (
          <GameAction
            label="Відповісти"
            onPress={() => {
              void Haptics.selectionAsync();
              setRevealed(true);
              setPoints((v) => v + earned);
            }}
          />
        )
      }
    >
      <View style={styles.yearCard}>
        <View style={styles.yearPoster}>
          <Poster item={q.card} />
        </View>
        <Text style={styles.subjectTitle}>{q.card.title}</Text>
        <View style={styles.yearValue}>
          <MotionPressable
            disabled={revealed}
            style={styles.yearStep}
            onPress={() => setGuess((v) => Math.max(1950, v - 1))}
            accessibilityLabel="Рік менше"
          >
            <Ionicons name="remove" size={24} color={colors.text} />
          </MotionPressable>
          <Text style={styles.yearText}>{guess}</Text>
          <MotionPressable
            disabled={revealed}
            style={styles.yearStep}
            onPress={() =>
              setGuess((v) => Math.min(new Date().getFullYear(), v + 1))
            }
            accessibilityLabel="Рік більше"
          >
            <Ionicons name="add" size={24} color={colors.text} />
          </MotionPressable>
        </View>
      </View>
    </GameShell>
  );
}
function TimelineSession({ onExit }: { onExit: () => void }) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [index, setIndex] = useState(0);
  const [placed, setPlaced] = useState<GameTitle[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const query = useQuery({
    queryKey: queryKeys.gameQuestions("timeline", 5),
    queryFn: ({ signal }) => getGameQuestions("timeline", 5, signal),
  });
  const q = query.data?.[index];
  const restart = () => {
    setIndex(0);
    setPlaced([]);
    setScore(0);
    setRevealed(false);
    void query.refetch();
  };
  if (query.isLoading) return <ScreenState loading title="Гортаємо архів" />;
  if (!q)
    return (
      <GameResult
        eyebrow="Хронологія"
        score={score}
        caption={`з ${query.data?.length ?? 0} рядів зібрано без помилок`}
        onRestart={restart}
        onExit={onExit}
      />
    );
  const items = q.items ?? [];
  const pool = items.filter(
    (item) => !placed.some((x) => x.tmdbId === item.tmdbId),
  );
  const expected = [...items].sort((a, b) =>
    (a.releaseDate ?? a.year ?? "").localeCompare(
      b.releaseDate ?? b.year ?? "",
    ),
  );
  const perfect =
    placed.length === expected.length &&
    placed.every((x, i) => x.tmdbId === expected[i]?.tmdbId);
  return (
    <GameShell
      eyebrow="Хронологія"
      question="Розстав від найстарішого до найновішого"
      round={{ index, total: query.data?.length }}
      score={score}
      onExit={onExit}
      footer={
        revealed ? (
          <>
            <GameFeedback
              correct={perfect}
              text={perfect ? "Ідеально!" : "Порядок не той"}
            />
            <GameAction
              label="Далі"
              onPress={() => {
                setIndex((v) => v + 1);
                setPlaced([]);
                setRevealed(false);
              }}
            />
          </>
        ) : (
          <GameAction
            label={
              placed.length === items.length
                ? "Перевірити"
                : `Обрано ${placed.length} з ${items.length}`
            }
            disabled={placed.length !== items.length}
            onPress={() => {
              setRevealed(true);
              if (perfect) setScore((v) => v + 1);
              void Haptics.notificationAsync(
                perfect
                  ? Haptics.NotificationFeedbackType.Success
                  : Haptics.NotificationFeedbackType.Error,
              );
            }}
          />
        )
      }
    >
      <View style={styles.timelineSlots}>
        {items.map((_, i) => {
          const item = placed[i];
          const right = revealed && item?.tmdbId === expected[i]?.tmdbId;
          return (
            <MotionPressable
              disabled={revealed || !item}
              key={i}
              style={[
                styles.timelineSlot,
                right && styles.correct,
                revealed && item && !right && styles.wrong,
              ]}
              onPress={() =>
                item &&
                setPlaced((v) => v.filter((x) => x.tmdbId !== item.tmdbId))
              }
            >
              <Text style={styles.slotIndex}>{i + 1}</Text>
              <Text numberOfLines={2} style={styles.slotText}>
                {item?.title ?? "Порожньо"}
              </Text>
              {revealed && item ? (
                <Text style={styles.muted}>
                  {(item.releaseDate ?? item.year)?.slice(0, 4)}
                </Text>
              ) : null}
            </MotionPressable>
          );
        })}
      </View>
      {revealed ? (
        <Text style={styles.muted}>
          Правильний порядок:{" "}
          {expected
            .map(
              (x) => `${x.title} (${(x.releaseDate ?? x.year)?.slice(0, 4)})`,
            )
            .join(" → ")}
        </Text>
      ) : (
        <View style={styles.timelinePool}>
          {pool.map((item) => (
            <MotionPressable
              key={item.tmdbId}
              style={styles.poolCard}
              onPress={() => setPlaced((v) => [...v, item])}
            >
              <Image
                source={item.posterUrl ? { uri: item.posterUrl } : undefined}
                style={styles.poolPoster}
              />
              <Text numberOfLines={2} style={styles.optionText}>
                {item.title}
              </Text>
            </MotionPressable>
          ))}
        </View>
      )}
    </GameShell>
  );
}
const gameTitle = (mode: GameMode) => games.find((x) => x.mode === mode)?.title;

function answerId(q?: GameQuestion) {
  if (!q) return "";
  if (q.answer) return q.answer;
  if (q.answerId !== undefined) return String(q.answerId);
  return "";
}
function Question({
  question,
  selected,
  correctId,
  onChoose,
}: {
  question: GameQuestion;
  selected: string | null;
  correctId: string;
  onChoose: (id: string) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  if (question.left && question.right)
    return (
      <View style={styles.pair}>
        {(["left", "right"] as const).map((side) => (
          <TitleOption
            key={side}
            item={question[side]!}
            id={side}
            selected={selected}
            correctId={correctId}
            reveal={Boolean(selected)}
            onChoose={onChoose}
            mode={question.mode}
          />
        ))}
      </View>
    );
  return (
    <>
      <View style={styles.subject}>
        {question.card ? (
          <>
            <Poster item={question.card} />
            <Text style={styles.subjectTitle}>{question.card.title}</Text>
          </>
        ) : question.person ? (
          <>
            <Image
              source={
                question.person.profileUrl
                  ? { uri: question.person.profileUrl }
                  : undefined
              }
              style={styles.person}
            />
            <Text style={styles.subjectTitle}>{question.person.name}</Text>
          </>
        ) : null}
      </View>
      <View style={styles.options}>
        {question.people?.map((person) => (
          <MotionPressable
            key={person.tmdbId}
            style={[
              styles.personOption,
              selected && String(person.tmdbId) === correctId && styles.correct,
              selected === String(person.tmdbId) &&
                selected !== correctId &&
                styles.wrong,
            ]}
            onPress={() => onChoose(String(person.tmdbId))}
          >
            <Image
              source={
                person.profileUrl ? { uri: person.profileUrl } : undefined
              }
              style={styles.avatar}
            />
            <Text numberOfLines={2} style={styles.optionText}>
              {person.name}
            </Text>
          </MotionPressable>
        ))}
        {question.options?.map((item) => (
          <TitleOption
            key={item.tmdbId}
            item={item}
            id={String(item.tmdbId)}
            selected={selected}
            correctId={correctId}
            reveal={Boolean(selected)}
            onChoose={onChoose}
            mode={question.mode}
          />
        ))}
      </View>
    </>
  );
}
function TitleOption({
  item,
  id,
  selected,
  correctId,
  reveal,
  onChoose,
  mode,
}: {
  item: GameTitle;
  id: string;
  selected: string | null;
  correctId: string;
  reveal: boolean;
  onChoose: (id: string) => void;
  mode: GameMode;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <MotionPressable
      style={[
        styles.titleOption,
        reveal && id === correctId && styles.correct,
        selected === id && id !== correctId && styles.wrong,
      ]}
      onPress={() => onChoose(id)}
    >
      <Poster item={item} />
      <Text numberOfLines={2} style={styles.optionText}>
        {item.title}
      </Text>
      <Text style={styles.muted}>
        {reveal
          ? mode === "rating"
            ? item.rating
            : (item.releaseDate ?? item.year)
          : item.year}
      </Text>
    </MotionPressable>
  );
}
function Poster({ item }: { item: GameTitle }) {
  const { colors } = useTheme();
  return item.posterUrl ? (
    <Image source={{ uri: item.posterUrl }} style={base.poster} />
  ) : (
    <View style={[base.poster, { backgroundColor: colors.card }]}>
      <Text style={{ color: colors.text, fontSize: 30, fontWeight: "900" }}>
        {item.title.slice(0, 1)}
      </Text>
    </View>
  );
}
const base = StyleSheet.create({
  poster: {
    width: "100%",
    aspectRatio: 2 / 3,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
});
const makeStyles = (c: Palette) =>
  StyleSheet.create({
    hub: { gap: 11 },
    group: { gap: 11 },
    groupHead: { gap: 2 },
    groupTitle: { color: c.text, fontSize: 19, fontWeight: "900" },
    groupHint: { color: c.textMuted, fontSize: 12.5 },
    grow: { flex: 1 },
    hubTitle: { color: c.text, fontSize: 17, fontWeight: "900" },
    muted: { color: c.textMuted, lineHeight: 19, marginTop: 3 },
    formatCard: {
      minHeight: 94,
      flexDirection: "row",
      alignItems: "center",
      gap: 15,
      padding: 18,
      borderRadius: 23,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    pair: { flexDirection: "row", gap: 10 },
    titleOption: {
      flex: 1,
      gap: 7,
      padding: 9,
      borderRadius: 19,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    correct: { borderColor: c.accent, backgroundColor: c.accentSoft },
    wrong: { borderColor: c.error, opacity: 0.72 },
    optionText: { color: c.text, fontWeight: "800" },
    subject: { alignItems: "center", gap: 10 },
    subjectTitle: {
      color: c.text,
      fontSize: 20,
      fontWeight: "900",
      textAlign: "center",
    },
    person: {
      width: 128,
      height: 128,
      borderRadius: 40,
      backgroundColor: c.card,
    },
    options: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    personOption: {
      width: "47%",
      minHeight: 86,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 10,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    avatar: {
      width: 54,
      height: 54,
      borderRadius: 18,
      backgroundColor: c.elevated,
    },
    hint: { color: c.textMuted, fontSize: 13, textAlign: "center" },
    formatIcon: {
      width: 50,
      height: 50,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.elevated,
    },
    formatMeta: {
      color: c.eyebrow,
      fontSize: 11.5,
      fontWeight: "700",
      marginTop: 5,
    },
    yearPoster: { width: 148, alignSelf: "center" },
    details: {
      minHeight: 46,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 7,
      paddingHorizontal: 14,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    detailsText: { color: c.text, fontWeight: "800" },
    yearCard: {
      gap: 15,
      padding: 16,
      borderRadius: 22,
      backgroundColor: c.card,
    },
    yearValue: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 18,
    },
    yearStep: {
      width: 50,
      height: 50,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.elevated,
    },
    yearText: { color: c.text, fontSize: 38, fontWeight: "900" },
    timelineSlots: { gap: 8 },
    timelineSlot: {
      minHeight: 62,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      padding: 10,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    slotIndex: { width: 28, color: c.accent, fontSize: 18, fontWeight: "900" },
    slotText: { flex: 1, color: c.text, fontWeight: "800" },
    timelinePool: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
    poolCard: {
      width: "47%",
      padding: 8,
      gap: 6,
      borderRadius: 16,
      backgroundColor: c.card,
    },
    poolPoster: {
      width: "100%",
      height: 112,
      borderRadius: 12,
      backgroundColor: c.elevated,
    },
  });

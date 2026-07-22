import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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
import { useAuthStore } from "../../auth/store/authStore";

type Format = "rounds" | "survival";
type GameConfig = {
  mode: GameMode;
  emoji: string;
  title: string;
  description: string;
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
  if (!mode)
    return (
      <FeatureScreen
        title="Ігрова зала"
        subtitle="Тренуй кіноінтуїцію короткими сесіями — без окремої дубльованої endless-гри."
      >
        <GameDashboard />
        <ChallengeInbox />
        <MotionPressable
          style={styles.daily}
          onPress={() => {
            const rotation: GameMode[] = ["release_date", "poster", "rating"];
            const day = Math.floor(Date.now() / 86400000);
            setDaily(true);
            setMode(rotation[day % rotation.length]);
            setFormat("rounds");
          }}
        >
          <Text style={styles.emoji}>🔥</Text>
          <View style={styles.grow}>
            <Text style={styles.hubTitle}>Щоденний виклик</Text>
            <Text style={styles.muted}>
              Однакове завдання для всіх · нове щодня
            </Text>
          </View>
          <Ionicons name="chevron-forward" color={colors.accent} size={21} />
        </MotionPressable>
        <View style={styles.hub}>
          {games.map((game, index) => (
            <MotionPressable
              key={game.mode}
              style={[
                styles.hubCard,
                { transform: [{ rotate: index % 2 ? ".5deg" : "-.5deg" }] },
              ]}
              onPress={() => {
                setDaily(false);
                setMode(game.mode);
                if (fixedModes.has(game.mode)) setFormat("rounds");
              }}
            >
              <Text style={styles.emoji}>{game.emoji}</Text>
              <View style={styles.grow}>
                <Text style={styles.hubTitle}>{game.title}</Text>
                <Text style={styles.muted}>{game.description}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                color={colors.accent}
                size={21}
              />
            </MotionPressable>
          ))}
          {[
            {
              href: "/games/wheel",
              emoji: "🎡",
              title: "Колесо вечора",
              text: "Обери випадковий тайтл",
            },
            {
              href: "/games/friend-taste",
              emoji: "👥",
              title: "Смак друга",
              text: "Вгадай оцінки друга",
            },
            {
              href: "/games/akinator",
              emoji: "🔮",
              title: "Кіноакінатор",
              text: "Задумай фільм — ми вгадаємо",
            },
          ].map((item) => (
            <MotionPressable
              key={item.href}
              style={styles.hubCard}
              onPress={() => router.push(item.href as Href)}
            >
              <Text style={styles.emoji}>{item.emoji}</Text>
              <View style={styles.grow}>
                <Text style={styles.hubTitle}>{item.title}</Text>
                <Text style={styles.muted}>{item.text}</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                color={colors.accent}
                size={21}
              />
            </MotionPressable>
          ))}
        </View>
      </FeatureScreen>
    );
  if (!format)
    return (
      <FeatureScreen
        title={games.find((x) => x.mode === mode)?.title ?? "Кіногра"}
        subtitle="Обери темп сесії. У survival є три життя."
      >
        <MotionPressable
          style={styles.formatCard}
          onPress={() => setFormat("rounds")}
        >
          <Text style={styles.emoji}>🔟</Text>
          <View style={styles.grow}>
            <Text style={styles.hubTitle}>10 раундів</Text>
            <Text style={styles.muted}>Фіксована швидка сесія без життів</Text>
          </View>
        </MotionPressable>
        <MotionPressable
          style={styles.formatCard}
          onPress={() => setFormat("survival")}
        >
          <Text style={styles.emoji}>❤️</Text>
          <View style={styles.grow}>
            <Text style={styles.hubTitle}>До поразки</Text>
            <Text style={styles.muted}>Три життя, грай якомога довше</Text>
          </View>
        </MotionPressable>
        <MotionPressable
          style={styles.backChoice}
          onPress={() => setMode(null)}
        >
          <Text style={styles.muted}>← Інша гра</Text>
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
      <FeatureScreen
        title="Сесію завершено"
        subtitle={`Результат ${score} · найкраща серія ${best}`}
      >
        <View style={styles.summary}>
          <Text style={styles.summaryScore}>{score}</Text>
          <Text style={styles.muted}>
            {format === "survival"
              ? "правильних до поразки"
              : `з ${query.data?.length ?? 10} правильних`}
          </Text>
        </View>
        <MotionPressable style={styles.primary} onPress={restart}>
          <Text style={styles.primaryText}>Зіграти ще</Text>
        </MotionPressable>
        <MotionPressable style={styles.backChoice} onPress={onExit}>
          <Text style={styles.muted}>До ігрової зали</Text>
        </MotionPressable>
      </FeatureScreen>
    );
  if (!q) return null;
  return (
    <FeatureScreen
      title={q.prompt}
      subtitle={`${daily ? "Щоденний виклик · " : ""}Раунд ${index + 1}${format === "rounds" ? `/${query.data?.length}` : ""} · ${score} очок · серія ${streak}${format === "survival" ? ` · ${"♥".repeat(Math.max(lives, 0))}` : ""}`}
    >
      <Question
        question={q}
        selected={selected}
        correctId={correctId}
        onChoose={choose}
      />
      {selected ? (
        <>
          <Text
            style={[
              styles.feedback,
              { color: selected === correctId ? colors.accent : colors.error },
            ]}
          >
            {selected === correctId ? "Правильно!" : "Не цього разу"}
          </Text>
          {q.card ? (
            <MotionPressable
              style={styles.details}
              onPress={() =>
                router.push(
                  `/title/${q.card!.mediaType}/${q.card!.tmdbId}` as Href,
                )
              }
            >
              <Text style={styles.detailsText}>Відкрити {q.card.title}</Text>
            </MotionPressable>
          ) : null}
          <MotionPressable style={styles.primary} onPress={next}>
            <Text style={styles.primaryText}>
              {index + 1 >= (query.data?.length ?? 0)
                ? "Результат"
                : "Наступний раунд"}
            </Text>
          </MotionPressable>
        </>
      ) : null}
    </FeatureScreen>
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
  if (query.isLoading)
    return <ScreenState loading title="Перемотуємо плівку" />;
  if (!q?.card)
    return (
      <FeatureScreen title="Гру завершено" subtitle={`${points} очок`}>
        <MotionPressable
          style={styles.primary}
          onPress={() => {
            setIndex(0);
            setPoints(0);
            setGuess(2000);
            setRevealed(false);
            void query.refetch();
          }}
        >
          <Text style={styles.primaryText}>Ще раз</Text>
        </MotionPressable>
        <MotionPressable style={styles.backChoice} onPress={onExit}>
          <Text style={styles.muted}>До ігор</Text>
        </MotionPressable>
      </FeatureScreen>
    );
  const actual = Number((q.card.releaseDate ?? q.card.year ?? "").slice(0, 4));
  const diff = Math.abs(guess - actual);
  const earned = diff === 0 ? 50 : Math.max(0, 30 - diff * 3);
  return (
    <FeatureScreen
      title="Вгадай рік"
      subtitle={`Раунд ${index + 1}/${query.data?.length} · ${points} очок`}
    >
      <View style={styles.yearCard}>
        <Poster item={q.card} />
        <Text style={styles.subjectTitle}>{q.card.title}</Text>
        <View style={styles.yearValue}>
          <MotionPressable
            disabled={revealed}
            style={styles.yearStep}
            onPress={() => setGuess((v) => Math.max(1950, v - 1))}
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
          >
            <Ionicons name="add" size={24} color={colors.text} />
          </MotionPressable>
        </View>
        {revealed ? (
          <>
            <Text
              style={[
                styles.feedback,
                { color: diff <= 2 ? colors.accent : colors.error },
              ]}
            >
              Правильно: {actual} · +{earned}
            </Text>
            <MotionPressable
              style={styles.primary}
              onPress={() => {
                setIndex((v) => v + 1);
                setGuess(2000);
                setRevealed(false);
              }}
            >
              <Text style={styles.primaryText}>Далі</Text>
            </MotionPressable>
          </>
        ) : (
          <MotionPressable
            style={styles.primary}
            onPress={() => {
              setRevealed(true);
              setPoints((v) => v + earned);
            }}
          >
            <Text style={styles.primaryText}>Відповісти</Text>
          </MotionPressable>
        )}
      </View>
    </FeatureScreen>
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
  if (query.isLoading) return <ScreenState loading title="Гортаємо архів" />;
  if (!q)
    return (
      <FeatureScreen
        title="Хронологію завершено"
        subtitle={`${score}/${query.data?.length ?? 0} правильних`}
      >
        <MotionPressable
          style={styles.primary}
          onPress={() => {
            setIndex(0);
            setPlaced([]);
            setScore(0);
            setRevealed(false);
            void query.refetch();
          }}
        >
          <Text style={styles.primaryText}>Ще раз</Text>
        </MotionPressable>
        <MotionPressable style={styles.backChoice} onPress={onExit}>
          <Text style={styles.muted}>До ігор</Text>
        </MotionPressable>
      </FeatureScreen>
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
    <FeatureScreen
      title="Хронологія"
      subtitle={`Раунд ${index + 1}/${query.data?.length} · від старого до нового`}
    >
      <View style={styles.timelineSlots}>
        {items.map((_, i) => {
          const item = placed[i];
          return (
            <MotionPressable
              disabled={revealed || !item}
              key={i}
              style={[
                styles.timelineSlot,
                revealed &&
                  item?.tmdbId === expected[i]?.tmdbId &&
                  styles.correct,
              ]}
              onPress={() =>
                item &&
                setPlaced((v) => v.filter((x) => x.tmdbId !== item.tmdbId))
              }
            >
              <Text style={styles.slotIndex}>{i + 1}</Text>
              <Text numberOfLines={2} style={styles.slotText}>
                {item?.title ?? "?"}
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
      {!revealed ? (
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
      ) : (
        <Text
          style={[
            styles.feedback,
            { color: perfect ? colors.accent : colors.error },
          ]}
        >
          {perfect
            ? "Ідеально!"
            : `Правильно: ${expected.map((x) => `${x.title} (${(x.releaseDate ?? x.year)?.slice(0, 4)})`).join(" → ")}`}
        </Text>
      )}
      <MotionPressable
        disabled={!revealed && placed.length !== items.length}
        style={styles.primary}
        onPress={() => {
          if (!revealed) {
            setRevealed(true);
            if (perfect) setScore((v) => v + 1);
          } else {
            setIndex((v) => v + 1);
            setPlaced([]);
            setRevealed(false);
          }
        }}
      >
        <Text style={styles.primaryText}>
          {revealed ? "Далі" : "Перевірити"}
        </Text>
      </MotionPressable>
    </FeatureScreen>
  );
}
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
    daily: {
      minHeight: 82,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 15,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.accent,
      backgroundColor: c.accentSoft,
    },
    hubCard: {
      minHeight: 86,
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      padding: 16,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    emoji: { fontSize: 31 },
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
    backChoice: {
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center",
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
    feedback: { fontSize: 21, fontWeight: "900", textAlign: "center" },
    primary: {
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 17,
      backgroundColor: c.accent,
    },
    primaryText: { color: c.background, fontWeight: "900" },
    details: {
      minHeight: 46,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 15,
      backgroundColor: c.card,
    },
    detailsText: { color: c.text, fontWeight: "800" },
    summary: {
      alignItems: "center",
      padding: 30,
      borderRadius: 24,
      backgroundColor: c.card,
    },
    summaryScore: { color: c.accent, fontSize: 58, fontWeight: "900" },
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

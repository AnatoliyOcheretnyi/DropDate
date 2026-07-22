import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useRouter, type Href } from "expo-router";
import { useTheme } from "../../../shared/theme/ThemeProvider";
import type { Palette } from "../../../shared/theme/palette";
import { FeatureScreen } from "../../../shared/ui/FeatureScreen";
import { MotionPressable } from "../../../shared/ui/MotionPressable";
import {
  finishAkinator,
  nextAkinator,
  startAkinator,
  type AkinatorAnswer,
  type AkinatorStep,
  type AnsweredQuestion,
} from "../api/akinator";
const answers: [AkinatorAnswer, string][] = [
  ["yes", "Так"],
  ["probably", "Скоріше так"],
  ["unknown", "Не знаю"],
  ["probably_not", "Скоріше ні"],
  ["no", "Ні"],
];
export function AkinatorScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [token, setToken] = useState("");
  const [step, setStep] = useState<AkinatorStep | null>(null);
  const [history, setHistory] = useState<AnsweredQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const start = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await startAkinator();
      setToken(r.sessionToken);
      setHistory([]);
      setStep({
        type: "question",
        step: r.step,
        candidates: r.candidates,
        question: r.question,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Гра недоступна");
    } finally {
      setLoading(false);
    }
  };
  const answer = async (value: AkinatorAnswer) => {
    if (!step?.question) return;
    const next = [...history, { questionId: step.question.id, answer: value }];
    setHistory(next);
    setLoading(true);
    try {
      setStep(await nextAkinator(token, next));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не вдалося продовжити");
    } finally {
      setLoading(false);
    }
  };
  const verdict = async (correct: boolean) => {
    if (step?.guess)
      await finishAkinator(token, step.guess.tmdbId, correct, history).catch(
        () => undefined,
      );
    if (correct && step?.guess)
      router.push(`/title/movie/${step.guess.tmdbId}` as Href);
    else void start();
  };
  if (!step)
    return (
      <FeatureScreen
        title="Кіноакінатор"
        subtitle="Задумай фільм. Я спробую вгадати його максимум за 20 питань."
      >
        <View style={styles.intro}>
          <View style={styles.orb}>
            <Text style={styles.orbText}>?</Text>
          </View>
          <Text style={styles.lead}>
            Відповідай чесно — одна неточність не зіб’є алгоритм.
          </Text>
          <MotionPressable
            disabled={loading}
            style={styles.primary}
            onPress={() => void start()}
          >
            <Text style={styles.primaryText}>
              {loading ? "Готую питання…" : "Почати гру"}
            </Text>
          </MotionPressable>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>
      </FeatureScreen>
    );
  if (step.type === "question" && step.question)
    return (
      <FeatureScreen
        title={step.question.text}
        subtitle={`Питання ${step.step}/20 · ${step.candidates} можливих фільмів`}
      >
        <View style={styles.orb}>
          <Text style={styles.orbText}>?</Text>
        </View>
        <View style={styles.answers}>
          {answers.map(([value, label]) => (
            <MotionPressable
              disabled={loading}
              key={value}
              style={styles.answer}
              onPress={() => void answer(value)}
            >
              <Text style={styles.answerText}>{label}</Text>
            </MotionPressable>
          ))}
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </FeatureScreen>
    );
  if (step.type === "guess" && step.guess)
    return (
      <FeatureScreen
        title="Це твій фільм?"
        subtitle={`${Math.round(step.guess.confidence * 100)}% впевненості`}
      >
        <View style={styles.guess}>
          {step.guess.posterUrl ? (
            <Image
              source={{ uri: step.guess.posterUrl }}
              style={styles.poster}
            />
          ) : null}
          <Text style={styles.guessTitle}>
            {step.guess.title}
            {step.guess.year ? ` · ${step.guess.year}` : ""}
          </Text>
          <View style={styles.verdict}>
            <MotionPressable
              haptic="success"
              style={styles.primary}
              onPress={() => void verdict(true)}
            >
              <Text style={styles.primaryText}>Так, вгадав!</Text>
            </MotionPressable>
            <MotionPressable
              style={styles.answer}
              onPress={() => void verdict(false)}
            >
              <Text style={styles.answerText}>Ні, ще раз</Text>
            </MotionPressable>
          </View>
        </View>
      </FeatureScreen>
    );
  return (
    <FeatureScreen title="Ти переміг" subtitle="Цей фільм мене перехитрив.">
      <MotionPressable style={styles.primary} onPress={() => void start()}>
        <Text style={styles.primaryText}>Нова гра</Text>
      </MotionPressable>
    </FeatureScreen>
  );
}
const makeStyles = (c: Palette) =>
  StyleSheet.create({
    intro: {
      minHeight: 420,
      alignItems: "center",
      justifyContent: "center",
      gap: 22,
    },
    orb: {
      alignSelf: "center",
      width: 104,
      height: 104,
      borderRadius: 52,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "#f5aa45",
      shadowColor: "#f5aa45",
      shadowOpacity: 0.35,
      shadowRadius: 28,
    },
    orbText: { color: "#321707", fontSize: 52, fontWeight: "900" },
    lead: {
      color: c.textMuted,
      fontSize: 17,
      lineHeight: 25,
      textAlign: "center",
    },
    primary: {
      minHeight: 54,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 22,
      borderRadius: 18,
      backgroundColor: c.accent,
    },
    primaryText: { color: c.background, fontWeight: "900" },
    error: { color: c.error, textAlign: "center" },
    answers: { gap: 10 },
    answer: {
      minHeight: 54,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 18,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.card,
    },
    answerText: { color: c.text, fontWeight: "800" },
    guess: { alignItems: "center", gap: 16 },
    poster: {
      width: 210,
      height: 315,
      borderRadius: 22,
      backgroundColor: c.card,
    },
    guessTitle: {
      color: c.text,
      fontSize: 24,
      fontWeight: "900",
      textAlign: "center",
    },
    verdict: { alignSelf: "stretch", gap: 10 },
  });

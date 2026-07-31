"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTasteTournament } from "../../profile/hooks/useTasteTournament";
import { useTasteOnboardingStatus } from "../hooks/useTasteOnboardingStatus";
import type { TasteKind } from "../../profile/store/tasteStore";
import { track } from "../../../shared/lib/analytics";

const labels: Record<TasteKind, Record<string, string>> = {
  genre: {
    action: "Бойовик",
    comedy: "Комедія",
    drama: "Драма",
    science_fiction: "Фантастика",
    thriller: "Трилер",
    adventure: "Пригоди",
    horror: "Жахи",
    romance: "Романтика",
    animation: "Анімація",
    fantasy: "Фентезі",
    mystery: "Детектив",
    documentary: "Документальні",
  },
  country: {
    US: "США",
    GB: "Британія",
    KR: "Корея",
    JP: "Японія",
    UA: "Україна",
    FR: "Франція",
    ES: "Іспанія",
    IN: "Індія",
  },
};

type Props = {
  forceOpen?: boolean;
  emphasis?: "inline" | "overlay";
};

type Celebration = "genre" | "country" | "completed" | null;

export function TasteOnboarding({ forceOpen = false, emphasis = "inline" }: Props) {
  const params = useSearchParams();
  const forcedByQuery = params.get("taste") === "1";
  const forced = forceOpen || forcedByQuery;
  const genre = useTasteTournament("genre");
  const country = useTasteTournament("country");
  const {
    status,
    isLoading,
    error,
    refetch,
    snooze,
    complete,
    isSaving,
  } = useTasteOnboardingStatus();
  const previousStageRef = useRef<string | null>(null);
  const trackedStartRef = useRef(false);
  const [celebration, setCelebration] = useState<Celebration>(null);

  useEffect(() => {
    if (!status?.stage) {
      return;
    }
    const previous = previousStageRef.current;
    if (!trackedStartRef.current && status.stage !== "completed") {
      track("taste_onboarding_started", { stage: status.stage });
      trackedStartRef.current = true;
    }
    if (previous === "genre" && status.stage === "country") {
      setCelebration("genre");
    } else if (previous && previous !== "completed" && status.stage === "completed") {
      setCelebration("completed");
      track("taste_onboarding_completed");
    }
    previousStageRef.current = status.stage;
  }, [status?.stage]);

  const currentKind = status?.stage === "country" ? "country" : "genre";
  const current = currentKind === "genre" ? genre : country;
  const comparisonTarget = status?.targetComparisons ?? 8;
  const totalDone =
    Math.min(status?.genreComparisons ?? 0, comparisonTarget) +
    Math.min(status?.countryComparisons ?? 0, comparisonTarget);
  const totalTarget = (status?.targetComparisons ?? 8) * 2;
  const isSnoozed =
    !forced &&
    typeof status?.snoozedUntil === "string" &&
    new Date(status.snoozedUntil).getTime() > Date.now();

  const stageCopy = useMemo(() => {
    switch (status?.stage) {
      case "country":
        return {
          eyebrow: "Крок 2 з 2",
          title: "Тепер визначимо країни",
          body: "Жанри вже зловили. Ще кілька швидких виборів — і покажемо персональні рекомендації.",
        };
      case "completed":
        return {
          eyebrow: "Готово",
          title: "Смак відкалібровано",
          body: "Можеш повернутись до цього в профілі будь-коли, якщо захочеш освіжити рекомендації.",
        };
      default:
        return {
          eyebrow: "Крок 1 з 2",
          title: "Зробимо рекомендації твоїми",
          body: "Почнемо з жанрів, а потім уточнимо улюблені країни виробництва.",
        };
    }
  }, [status?.stage]);

  if (isLoading) {
    return null;
  }

  if (error) {
    return (
      <section className="taste-onboarding taste-onboarding--error" role="alert">
        <p className="eyebrow">Калібрування недоступне</p>
        <h2>Не вдалося завантажити налаштування смаку</h2>
        <button type="button" className="secondary" onClick={() => void refetch()}>
          Спробувати ще раз
        </button>
      </section>
    );
  }

  if (!status || (status.completed && !celebration) || isSnoozed) return null;

  if (celebration) {
    const copy =
      celebration === "genre"
        ? {
            title: "Жанри збережено",
            body: "Дякую. Базу по жанрах уже зрозуміли. Тепер перейдемо до країн.",
            action: "Перейти до країн",
          }
        : celebration === "country"
          ? {
            title: "Країни теж готові",
            body: "Супер. Даних достатньо, щоб сформувати перші персональні рекомендації.",
            action: "Завершити",
            }
          : {
              title: "Калібрування завершено",
              body: "Тепер рекомендації мають відчутно краще тримати твій смак, але не замикати тебе в одній бульбашці.",
              action: "Закрити",
            };
    return (
      <section className={`taste-onboarding-shell${emphasis === "overlay" ? " taste-onboarding-shell--overlay" : ""}`}>
        <div className="taste-onboarding-shell__backdrop" aria-hidden="true" />
        <section className={`taste-onboarding taste-onboarding--celebration${emphasis === "overlay" ? " taste-onboarding--overlay" : ""}`}>
        <div className="taste-onboarding__burst" aria-hidden="true" />
        <p className="eyebrow">{celebration === "completed" ? "Готово" : "Дякую"}</p>
        <h2>{copy.title}</h2>
        <p>{copy.body}</p>
        <button
          type="button"
          className="taste-onboarding__primary"
          onClick={() => {
            if (celebration === "completed") {
              complete();
            }
            setCelebration(null);
          }}
        >
          {copy.action}
        </button>
        </section>
      </section>
    );
  }

  return (
    <section className={`taste-onboarding-shell${emphasis === "overlay" ? " taste-onboarding-shell--overlay" : ""}`}>
      <div className="taste-onboarding-shell__backdrop" aria-hidden="true" />
      <section className={`taste-onboarding${emphasis === "overlay" ? " taste-onboarding--overlay" : ""}`}>
      <div className="taste-onboarding__copy">
        <p className="eyebrow">{stageCopy.eyebrow}</p>
        <h2>{stageCopy.title}</h2>
        <p>{stageCopy.body}</p>
        <div className="taste-onboarding__progress" aria-label={`Прогрес ${totalDone} із ${totalTarget}`}>
          <span style={{ width: `${(totalDone / totalTarget) * 100}%` }} />
        </div>
        <div className="taste-onboarding__summary">
          <span>Жанри: {Math.min(status.genreComparisons, status.targetComparisons)}/{status.targetComparisons}</span>
          <span>Країни: {Math.min(status.countryComparisons, status.targetComparisons)}/{status.targetComparisons}</span>
        </div>
      </div>

      {(status.stage === "genre" || status.stage === "country") && current.pair ? (
        <div className="taste-onboarding__choice">
          <span>Що обираєш?</span>
          <button disabled={current.isSaving} onClick={() => current.compare("left")}>
            {labels[currentKind][current.pair.left] ?? current.pair.left}
          </button>
          <small>або</small>
          <button disabled={current.isSaving} onClick={() => current.compare("right")}>
            {labels[currentKind][current.pair.right] ?? current.pair.right}
          </button>
          <button
            className="taste-onboarding__tie"
            disabled={current.isSaving}
            onClick={() => current.compare("tie")}
          >
            Однаково
          </button>
        </div>
      ) : null}

      <div className="taste-onboarding__footer">
        <button
          className="taste-onboarding__later"
          onClick={() => snooze(1)}
          aria-label="Нагадати завтра"
        >
          Нагадати завтра
        </button>
        <span className="taste-onboarding__footnote">
          Завжди можна допройти це в профілі.
        </span>
      </div>
      </section>
    </section>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useTasteOnboardingStatus } from "../../home/hooks/useTasteOnboardingStatus";

export function TasteCalibrationCard() {
  const router = useRouter();
  const { status, isLoading } = useTasteOnboardingStatus();

  if (isLoading || !status) {
    return (
      <div className="taste-calibration-card">
        <p className="trend-kicker">Калібрування смаку</p>
        <strong>Готуємо статус…</strong>
      </div>
    );
  }

  const stageLabel =
    status.stage === "genre"
      ? "Почати з жанрів"
      : status.stage === "country"
        ? "Продовжити з країн"
        : "Смак-профіль налаштовано";

  const description =
    status.completed
        ? "Твої відповіді вже впливають на персональні рекомендації. Їх можна оновити будь-коли."
        : "Кілька швидких виборів допоможуть персоналізувати рекомендації.";

  const actionLabel = status.completed
    ? "Оновити відповіді"
    : status.stage === "country"
        ? "Обрати країни"
        : "Обрати жанри";

  const completed = (value: number, target: number) =>
    `${Math.min(value, target)}/${target}`;

  return (
    <div className="taste-calibration-card">
      <div>
        <p className="trend-kicker">Калібрування смаку</p>
        <strong>{status.completed ? "Профіль смаку збережено" : stageLabel}</strong>
        <p className="taste-calibration-card__description">{description}</p>
        <span>
          Жанри {completed(status.genreComparisons, status.targetComparisons)} · Країни{" "}
          {completed(status.countryComparisons, status.targetComparisons)}
        </span>
      </div>
      {!status.completed ? (
        <button type="button" onClick={() => router.push("/?taste=1")}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

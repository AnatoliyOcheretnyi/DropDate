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
        : status.stage === "titles"
          ? "Оцінити кілька тайтлів"
          : "Оновити смак-профіль";

  return (
    <div className="taste-calibration-card">
      <div>
        <p className="trend-kicker">Калібрування смаку</p>
        <strong>{status.completed ? "Профіль смаку збережено" : stageLabel}</strong>
        <span>
          Жанри {status.genreComparisons}/{status.targetComparisons} · Країни{" "}
          {status.countryComparisons}/{status.targetComparisons} · Тайтли{" "}
          {status.titleFeedbackCount}/{status.targetTitleFeedback}
        </span>
      </div>
      <button type="button" onClick={() => router.push("/?taste=1")}>
        {status.completed ? "Перекалібрувати" : "Продовжити"}
      </button>
    </div>
  );
}

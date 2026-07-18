"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../shared/state/auth";
import { useTasteTournament } from "../../profile/hooks/useTasteTournament";
import type { TasteKind } from "../../profile/store/tasteStore";

const labels: Record<TasteKind, Record<string, string>> = {
  genre: {
    action: "Бойовик", comedy: "Комедія", drama: "Драма", science_fiction: "Фантастика",
    thriller: "Трилер", adventure: "Пригоди", horror: "Жахи", romance: "Романтика",
    animation: "Анімація", fantasy: "Фентезі", mystery: "Детектив", documentary: "Документальні",
  },
  country: { US: "США", GB: "Британія", KR: "Корея", JP: "Японія", UA: "Україна", FR: "Франція", ES: "Іспанія", IN: "Індія" },
};

const targetComparisons = 8;

export function TasteOnboarding() {
  const { user, accessToken } = useAuth();
  const queryClient = useQueryClient();
  const genre = useTasteTournament("genre");
  const country = useTasteTournament("country");
  const [kind, setKind] = useState<TasteKind>("genre");
  const [dismissed, setDismissed] = useState(false);
  const current = kind === "genre" ? genre : country;
  const complete = genre.comparisons >= targetComparisons && country.comparisons >= targetComparisons;
  const statusKey = ["taste-onboarding", user?.id] as const;
  const status = useQuery({
    queryKey: statusKey,
    enabled: Boolean(user && accessToken),
    queryFn: async () => {
      const response = await fetch("/api/taste/onboarding", {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error("Не вдалося перевірити onboarding");
      return response.json() as Promise<{ completed: boolean }>;
    },
  });
  const completion = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/taste/onboarding", {
        method: "POST",
        headers: { authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error("Не вдалося зберегти onboarding");
    },
    onSuccess: () => queryClient.setQueryData(statusKey, { completed: true }),
  });

  useEffect(() => {
    if (complete && status.data && !status.data.completed && !completion.isPending) {
      completion.mutate();
    }
  }, [complete, completion, status.data]);

  if (!user || status.isLoading || status.data?.completed || dismissed || complete || current.isLoading || !current.pair) {
    return null;
  }

  const total = Math.min(targetComparisons, genre.comparisons) + Math.min(targetComparisons, country.comparisons);
  const label = (id: string) => labels[kind][id] ?? id;

  return (
    <section className="taste-onboarding">
      <div className="taste-onboarding__copy">
        <p className="eyebrow">Калібрування смаку</p>
        <h2>Зробимо рекомендації твоїми</h2>
        <p>Кілька швидких виборів. Ми збережемо різноманіття, але краще зрозуміємо твою базу.</p>
        <div className="taste-onboarding__progress" aria-label={`Прогрес ${total} із ${targetComparisons * 2}`}>
          <span style={{ width: `${(total / (targetComparisons * 2)) * 100}%` }} />
        </div>
        <div className="taste-onboarding__tabs">
          {(["genre", "country"] as TasteKind[]).map((entry) => (
            <button key={entry} className={kind === entry ? "is-active" : ""} onClick={() => setKind(entry)}>
              {entry === "genre" ? "Жанри" : "Країни"}
            </button>
          ))}
        </div>
      </div>
      <div className="taste-onboarding__choice">
        <span>Що обираєш?</span>
        <button disabled={current.isSaving} onClick={() => current.compare("left")}>{label(current.pair!.left)}</button>
        <small>або</small>
        <button disabled={current.isSaving} onClick={() => current.compare("right")}>{label(current.pair!.right)}</button>
        <button className="taste-onboarding__tie" disabled={current.isSaving} onClick={() => current.compare("tie")}>Однаково</button>
      </div>
      <button className="taste-onboarding__later" onClick={() => setDismissed(true)} aria-label="Пройти пізніше">Пізніше</button>
    </section>
  );
}

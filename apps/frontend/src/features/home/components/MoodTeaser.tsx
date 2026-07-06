"use client";

import { useRouter } from "next/navigation";

type Mood = {
  id: string;
  emoji: string;
  label: string;
};

const MOODS: Mood[] = [
  { id: "calm", emoji: "😌", label: "Спокій" },
  { id: "laugh", emoji: "😂", label: "Посміятись" },
  { id: "adrenaline", emoji: "😱", label: "Адреналін" },
  { id: "cry", emoji: "💔", label: "Поплакати" },
  { id: "mind", emoji: "🤯", label: "Розрив мозку" },
];

export function MoodTeaser() {
  const router = useRouter();

  return (
    <section className="mood-teaser trend-bleed">
      <div className="trend-inner">
        <div className="mood-teaser__shell">
          <div className="mood-teaser__aura" aria-hidden="true" />
          <div className="mood-teaser__copy">
            <p className="trend-kicker">Один настрій — одна добірка</p>
            <h3>Який у тебе сьогодні вайб?</h3>
            <p className="mood-teaser__lead">
              Обери настрій — і ми підберемо, що подивитись саме зараз.
            </p>
          </div>
          <div className="mood-teaser__options">
            {MOODS.map((mood) => (
              <button
                key={mood.id}
                type="button"
                className="mood-teaser__chip"
                onClick={() => router.push("/mood")}
              >
                <span className="mood-teaser__emoji" aria-hidden="true">
                  {mood.emoji}
                </span>
                <span>{mood.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

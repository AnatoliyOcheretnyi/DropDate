"use client";

import Link from "next/link";

type Tile = {
  href: string;
  icon: string;
  eyebrow: string;
  title: string;
  hint: string;
  variant: string;
};

type Props = {
  savedCount: number;
};

export function FeatureTiles({ savedCount }: Props) {
  const tiles: Tile[] = [
    {
      href: "/mood",
      icon: "🎭",
      eyebrow: "Підбір за настроєм",
      title: "Не знаєш що\nдивитись?",
      hint: "Кілька питань — і готова добірка",
      variant: "mood",
    },
    {
      href: "/match",
      icon: "🔀",
      eyebrow: "Кінопідбірник",
      title: "Звузимо до\nідеального",
      hint: "Обирай між парами тайтлів",
      variant: "match",
    },
    {
      href: "/games",
      icon: "🎮",
      eyebrow: "Міні-ігри",
      title: "Кіно-баттл",
      hint: "Вгадуй релізи й рейтинги",
      variant: "games",
    },
    {
      href: "/saved",
      icon: "💾",
      eyebrow: "Твоя колекція",
      title: "Мій список",
      hint:
        savedCount > 0
          ? `${savedCount} у списку — повернутись`
          : "Збережені тайтли в одному місці",
      variant: "saved",
    },
  ];

  return (
    <section className="feature-tiles trend-bleed">
      <div className="trend-inner">
        <div className="feature-tiles__grid">
          {tiles.map((tile) => (
            <Link
              key={tile.href}
              href={tile.href}
              className={`feature-tile feature-tile--${tile.variant}`}
            >
              <span className="feature-tile__glow" aria-hidden="true" />
              <span className="feature-tile__icon" aria-hidden="true">
                {tile.icon}
              </span>
              <span className="feature-tile__body">
                <span className="feature-tile__eyebrow">{tile.eyebrow}</span>
                <span className="feature-tile__title">{tile.title}</span>
                <span className="feature-tile__hint">{tile.hint}</span>
              </span>
              <span className="feature-tile__arrow" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

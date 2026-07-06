"use client";

import { useState } from "react";

type Chip = {
  id: string;
  label: string;
  icon?: string;
};

const GENRES: Chip[] = [
  { id: "action", label: "Бойовик", icon: "💥" },
  { id: "comedy", label: "Комедія", icon: "😂" },
  { id: "drama", label: "Драма", icon: "🎭" },
  { id: "scifi", label: "Фантастика", icon: "🛸" },
  { id: "horror", label: "Жахи", icon: "👻" },
  { id: "thriller", label: "Трилер", icon: "🔪" },
  { id: "romance", label: "Романтика", icon: "💘" },
  { id: "adventure", label: "Пригоди", icon: "🧭" },
  { id: "animation", label: "Анімація", icon: "🎨" },
  { id: "fantasy", label: "Фентезі", icon: "🐉" },
  { id: "crime", label: "Детектив", icon: "🕵️" },
  { id: "docs", label: "Документальні", icon: "🎥" },
];

const COUNTRIES: Chip[] = [
  { id: "us", label: "США", icon: "🇺🇸" },
  { id: "gb", label: "Британія", icon: "🇬🇧" },
  { id: "kr", label: "Корея", icon: "🇰🇷" },
  { id: "jp", label: "Японія", icon: "🇯🇵" },
  { id: "ua", label: "Україна", icon: "🇺🇦" },
  { id: "fr", label: "Франція", icon: "🇫🇷" },
  { id: "es", label: "Іспанія", icon: "🇪🇸" },
  { id: "in", label: "Індія", icon: "🇮🇳" },
];

function ChipRow({
  items,
  selected,
  onToggle,
}: {
  items: Chip[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  return (
    <div className="taste-chips__row">
      {items.map((chip) => {
        const isActive = selected.has(chip.id);
        return (
          <button
            key={chip.id}
            type="button"
            className={`taste-chip${isActive ? " is-active" : ""}`}
            aria-pressed={isActive}
            onClick={() => onToggle(chip.id)}
          >
            {chip.icon ? (
              <span className="taste-chip__icon" aria-hidden="true">
                {chip.icon}
              </span>
            ) : null}
            <span>{chip.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function TasteChips() {
  const [genres, setGenres] = useState<Set<string>>(new Set());
  const [countries, setCountries] = useState<Set<string>>(new Set());

  const toggle =
    (setter: React.Dispatch<React.SetStateAction<Set<string>>>) =>
    (id: string) => {
      setter((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    };

  return (
    <section className="taste-chips trend-bleed">
      <div className="trend-inner">
        <div className="taste-chips__head">
          <p className="trend-kicker">Під твій смак</p>
          <h3>Обери жанр чи країну</h3>
        </div>
        <ChipRow items={GENRES} selected={genres} onToggle={toggle(setGenres)} />
        <ChipRow
          items={COUNTRIES}
          selected={countries}
          onToggle={toggle(setCountries)}
        />
      </div>
    </section>
  );
}

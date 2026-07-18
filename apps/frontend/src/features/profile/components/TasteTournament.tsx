"use client";

import type { TasteKind } from "../store/tasteStore";
import { useTasteTournament } from "../hooks/useTasteTournament";

const labels: Record<TasteKind, Record<string, string>> = {
  genre: {
    action: "Бойовик", comedy: "Комедія", drama: "Драма",
    science_fiction: "Фантастика", thriller: "Трилер", adventure: "Пригоди",
    horror: "Жахи", romance: "Романтика", animation: "Анімація",
    fantasy: "Фентезі", mystery: "Детектив", documentary: "Документальні",
  },
  country: {
    US: "США", GB: "Британія", KR: "Корея", JP: "Японія",
    UA: "Україна", FR: "Франція", ES: "Іспанія", IN: "Індія",
  },
};

type Props = { kind: TasteKind; title: string };

export function TasteTournament({ kind, title }: Props) {
  const state = useTasteTournament(kind);
  const label = (id: string) => labels[kind][id] ?? id;

  return (
    <div className="taste-tournament">
      <div className="taste-tournament__head">
        <div>
          <p className="trend-kicker">Швидкий вибір</p>
          <h3>{title}</h3>
        </div>
        <span>{Math.round(state.confidence * 100)}% точності</span>
      </div>

      {state.isLoading || !state.pair ? (
        <div className="taste-tournament__loading">Готуємо наступну пару…</div>
      ) : (
        <>
          <p className="taste-tournament__question">Що тобі ближче?</p>
          <div className="taste-tournament__duel">
            <button disabled={state.isSaving} onClick={() => state.compare("left")}>
              {label(state.pair.left)}
            </button>
            <span>або</span>
            <button disabled={state.isSaving} onClick={() => state.compare("right")}>
              {label(state.pair.right)}
            </button>
          </div>
          <button
            type="button"
            className="taste-tournament__tie"
            disabled={state.isSaving}
            onClick={() => state.compare("tie")}
          >
            Подобається однаково
          </button>
        </>
      )}

      {state.error ? <p className="taste-tournament__error">{state.error}</p> : null}
      <ol className="taste-tournament__ranking">
        {state.items.map((item, index) => (
          <li key={item.id}>
            <strong>{index + 1}</strong>
            <span>{label(item.id)}</span>
            <small>{item.comparisons} порівнянь</small>
          </li>
        ))}
      </ol>
    </div>
  );
}

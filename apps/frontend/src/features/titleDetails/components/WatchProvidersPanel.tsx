"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { WatchAvailability, WatchProvider } from "../../../shared/lib/release";

const COUNTRY_KEY = "dropdate:watch-country";
const SERVICES_KEY = "dropdate:watch-services";
const COUNTRIES = [["UA", "Україна"], ["PL", "Польща"], ["DE", "Німеччина"], ["GB", "Британія"], ["US", "США"], ["FR", "Франція"]] as const;

function ProviderRow({ title, icon, items, preferred, onToggle }: { title: string; icon: string; items?: WatchProvider[]; preferred: number[]; onToggle: (id: number) => void }) {
  if (!items?.length) return null;
  const sorted = [...items].sort((a, b) => Number(preferred.includes(b.id)) - Number(preferred.includes(a.id)));
  return (
    <div className="watch-providers__row">
      <div className="watch-providers__label"><span aria-hidden="true">{icon}</span><strong>{title}</strong></div>
      <div className="watch-providers__services">
        {sorted.map((item) => (
          <button type="button" className={preferred.includes(item.id) ? "is-preferred" : ""} key={item.id} aria-pressed={preferred.includes(item.id)} title={`${item.name} · змінити пріоритет`} onClick={() => onToggle(item.id)}>
            {item.logoUrl ? <Image src={item.logoUrl} alt="" width={48} height={48} /> : <span className="watch-providers__fallback">{item.name.slice(0, 1)}</span>}
            <small>{item.name}</small><i aria-hidden="true">★</i>
          </button>
        ))}
      </div>
    </div>
  );
}

export function WatchProvidersPanel({ providers }: { providers?: Record<string, WatchAvailability> }) {
  const [country, setCountry] = useState("UA");
  const [preferred, setPreferred] = useState<number[]>([]);
  useEffect(() => {
    setCountry(window.localStorage.getItem(COUNTRY_KEY) || "UA");
    try { setPreferred(JSON.parse(window.localStorage.getItem(SERVICES_KEY) || "[]")); } catch { setPreferred([]); }
  }, []);
  const selectCountry = (value: string) => { setCountry(value); window.localStorage.setItem(COUNTRY_KEY, value); };
  const toggle = (id: number) => setPreferred((current) => {
    const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
    window.localStorage.setItem(SERVICES_KEY, JSON.stringify(next));
    return next;
  });
  const availability = providers?.[country];
  const hasOptions = Boolean(availability && [availability.stream, availability.free, availability.rent, availability.buy].some((items) => items?.length));

  return (
    <section className="watch-providers details-section">
      <header className="watch-providers__head">
        <div><p className="eyebrow">Доступність</p><h2>Де дивитися</h2><p>Сервіси та способи перегляду у твоєму регіоні.</p></div>
        <label><span>Країна</span><select aria-label="Країна доступності" value={country} onChange={(event) => selectCountry(event.target.value)}>{COUNTRIES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select></label>
      </header>
      {hasOptions && availability ? (
        <div className="watch-providers__content">
          <p className="watch-providers__hint">Познач улюблені сервіси зірочкою — вони завжди будуть першими.</p>
          <ProviderRow title="За підпискою" icon="▶" items={availability.stream} preferred={preferred} onToggle={toggle} />
          <ProviderRow title="Безкоштовно" icon="◉" items={availability.free} preferred={preferred} onToggle={toggle} />
          <ProviderRow title="Оренда" icon="◷" items={availability.rent} preferred={preferred} onToggle={toggle} />
          <ProviderRow title="Купівля" icon="＋" items={availability.buy} preferred={preferred} onToggle={toggle} />
          {availability.link ? <a className="watch-providers__more" href={availability.link} target="_blank" rel="noreferrer">Переглянути всі варіанти <span>↗</span></a> : null}
        </div>
      ) : (
        <div className="watch-providers__empty"><span aria-hidden="true">⌁</span><div><strong>Поки немає даних для цього регіону</strong><p>Спробуй змінити країну — доступність сервісів відрізняється.</p></div></div>
      )}
      <small className="watch-providers__credit">Дані надає JustWatch через TMDB і можуть змінюватися.</small>
    </section>
  );
}

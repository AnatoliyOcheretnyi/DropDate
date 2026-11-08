"use client";
import { MovieInfoButton } from "../../shared/ui/MovieInfoButton";

import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "../../widgets/Header";
import { AuthModal } from "../../widgets/AuthModal";
import { CoverImage } from "../../shared/ui/CoverImage";
import { fetchWithAuth, useAuth } from "../../shared/state/auth";
import { useSavedReleases } from "../saved/hooks/useSavedReleases";
import { track } from "../../shared/lib/analytics";
import countries from "./countries.json";
import { GENRES, itemKey, type WorldItem, type WorldResult } from "./types";
import { makeFilmRoute } from "./discovery";
import { WorldPanels } from "./WorldPanels";
import { isPassportMovie, loadWorldPassport } from "./passport";

const Globe = dynamic(() => import("./WorldGlobe"), {
  ssr: false,
  loading: () => <div className="world-loading">Готуємо глобус…</div>,
});
class GlobeBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
const MODES = [
  ["top", "Найкращі"],
  ["popular", "Популярні"],
  ["gems", "Перлини"],
  ["personal", "Для тебе"],
] as const;
const FLAG = (code: string) =>
  String.fromCodePoint(...code.split("").map((c) => 127397 + c.charCodeAt(0)));

export function WorldScreen() {
  const router = useRouter(),
    params = useSearchParams();
  const { user, accessToken } = useAuth();
  const { saved, getListTypes, toggleListType } = useSavedReleases();
  const [authOpen, setAuthOpen] = useState(false);
  const [globeAvailable, setGlobeAvailable] = useState(true);
  const [countrySearch, setCountrySearch] = useState("");
  const [routeOpen, setRouteOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [passportOpen, setPassportOpen] = useState(false);
  const [hidden, setHidden] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [pickingCountry, setPickingCountry] = useState(false);
  const [services, setServices] = useState<{ region: string; ids: number[] }>({
    region: "UA",
    ids: [],
  });
  const [busy, setBusy] = useState<string | null>(null);
  const country =
    countries.find((c) => c.code === params.get("country")) ??
    countries.find((c) => c.code === "UA")!;
  const mode = MODES.some(([id]) => id === params.get("mode"))
    ? params.get("mode")!
    : "top";
  const genre = params.get("genre") || "",
    decade = params.get("decade") || "",
    runtime = params.get("runtime") || "";
  const hideWatched = params.get("hideWatched") !== "0",
    onlyServices = params.get("services") === "1" && services.ids.length > 0;
  const activeFilterCount = [
    genre,
    decade,
    runtime,
    hideWatched,
    onlyServices,
  ].filter(Boolean).length;
  const seed = params.get("seed") || "",
    intent = params.get("intent") || "";
  const showFilms =
    params.get("view") === "films" ||
    (!params.has("view") && params.has("seed"));
  const page = Math.max(1, Math.min(10, Number(params.get("page")) || 1));
  const update = useCallback(
    (values: Record<string, string>) => {
      const next = new URLSearchParams(params.toString());
      next.delete("page");
      for (const [key, value] of Object.entries(values)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      if (values.country) next.set("view", "films");
      router.replace("/world?" + next, { scroll: false });
    },
    [params, router],
  );
  const selectCountry = useCallback(
    (code: string) => {
      update({ country: code });
      setCountrySearch("");
      setPassportOpen(false);
      track("world_country_selected", { country: code });
    },
    [update],
  );
  const returnToGlobe = useCallback(() => {
    setPassportOpen(false);
    update({ view: "globe", page: String(page) });
  }, [update, page]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || authOpen) return;
      if (passportOpen) setPassportOpen(false);
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [authOpen, passportOpen]);
  const unavailable = useCallback(() => setGlobeAvailable(false), []);
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2");
      setGlobeAvailable(Boolean(gl));
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
      const ids = JSON.parse(
        localStorage.getItem("dropdate:watch-services") || "[]",
      );
      setServices({
        region: localStorage.getItem("dropdate:watch-country") || "UA",
        ids: Array.isArray(ids)
          ? ids
              .filter((n: unknown) => typeof n === "number" && n > 0)
              .slice(0, 10)
          : [],
      });
    } catch {
      setGlobeAvailable(false);
    }
  }, []);
  useEffect(() => {
    setHidden([]);
    setNotice("");
  }, [country.code, mode, genre, decade, runtime, user?.id]);
  const watchedKeys = useMemo(
    () =>
      new Set(
        saved
          .filter(
            (s) =>
              s.listTypes?.includes("watched") ||
              s.watchCount ||
              s.lastWatchedAt,
          )
          .map((s) => `${s.mediaType}:${s.tmdbId}`),
      ),
    [saved],
  );
  const query = useQuery({
    queryKey: [
      "world",
      user?.id ?? "guest",
      country.code,
      mode,
      genre,
      decade,
      runtime,
      hideWatched,
      onlyServices,
      services,
      page,
      seed,
      intent,
    ],
    enabled: showFilms && (mode !== "personal" || Boolean(accessToken)),
    staleTime: 5 * 60 * 1000,
    queryFn: async ({ signal }): Promise<WorldResult> => {
      const q = new URLSearchParams({
        country: country.code,
        mode,
        page: String(page),
        hideWatched: hideWatched ? "1" : "0",
      });
      if (seed) q.set("seed", seed);
      if (intent) q.set("intent", intent);
      if (genre) q.set("genre", genre);
      if (decade) q.set("decade", decade);
      if (runtime) q.set("runtime", runtime);
      if (onlyServices && services.ids.length) {
        q.set("providers", services.ids.join(","));
        q.set("region", services.region);
      }
      const response = await fetchWithAuth("/api/world?" + q, {
        signal,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.message || data.error || "Не вдалося завантажити фільми",
        );
      return data;
    },
  });
  const passport = useQuery({
    queryKey: [
      "world-passport-viewing-lists",
      user?.id,
      [...new Set(saved.filter(isPassportMovie).map((s) => s.tmdbId))]
        .sort()
        .join(","),
    ],
    enabled: Boolean(accessToken),
    staleTime: 10 * 60 * 1000,
    retry: 1,
    queryFn: ({ signal }) => loadWorldPassport(signal),
  });
  const visited = useMemo(
    () => passport.data?.countries ?? {},
    [passport.data],
  );
  const items = useMemo(
    () =>
      (query.data?.items ?? []).filter(
        (item) =>
          !hidden.includes(itemKey(item)) &&
          (!hideWatched || !watchedKeys.has(itemKey(item))),
      ),
    [query.data, hidden, hideWatched, watchedKeys],
  );
  const route = useMemo(() => makeFilmRoute(items), [items]);
  useEffect(() => {
    if (showFilms && query.data)
      track("recommendations_shown", {
        surface: "world",
        country: country.code,
        count: query.data.items.length,
        mode,
        ai: query.data.aiUsed,
      });
  }, [query.data, country.code, mode, showFilms]);
  const feedback = async (item: WorldItem, action: "liked" | "disliked") => {
    if (!accessToken) {
      setAuthOpen(true);
      return;
    }
    setBusy(itemKey(item));
    setNotice("");
    try {
      const response = await fetchWithAuth("/api/recommendations/feedback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({ ...item, action }),
      });
      if (!response.ok) throw new Error();
      if (action === "disliked") setHidden((v) => [...v, itemKey(item)]);
      setNotice(
        action === "liked"
          ? "Врахуємо це в наступних рекомендаціях"
          : "Більше не рекомендуватимемо цей фільм",
      );
      track("recommendation_feedback", {
        surface: "world",
        action,
        tmdbId: item.tmdbId,
      });
    } catch {
      setNotice("Не вдалося зберегти реакцію. Спробуй ще раз.");
    } finally {
      setBusy(null);
    }
  };
  const mark = async (item: WorldItem, kind: "watchlist" | "watched") => {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const suggestion = {
      id: item.tmdbId,
      mediaType: item.mediaType,
      title: item.title,
      year: item.year,
      posterUrl: item.posterUrl,
    };
    if (kind !== "watched" || !getListTypes(suggestion).includes("watched"))
      toggleListType(suggestion, kind, {
        title: item.title,
        type: "movie",
        nextRelease: "",
        source: "tmdb",
        posterUrl: item.posterUrl,
        status: "released",
      });
    if (kind === "watched" && hideWatched)
      setHidden((v) => [...v, itemKey(item)]);
    track(kind === "watched" ? "title_watched" : "title_saved", {
      surface: "world",
      tmdbId: item.tmdbId,
      country: country.code,
    });
  };
  const pickCountry = async (seedItem?: WorldItem) => {
    setPickingCountry(true);
    try {
      if (accessToken) {
        const response = await fetchWithAuth("/api/bridge", {});
        if (response.ok) {
          const data = await response.json();
          const pick = data.items?.find(
            (v: { countryCode: string }) =>
              v.countryCode !== country.code && !visited[v.countryCode],
          );
          if (pick) {
            update({
              country: pick.countryCode,
              mode: "personal",
              ...(seedItem
                ? {
                    seed: String(seedItem.tmdbId),
                    intent: "Знайди близький за темами фільм з іншої країни",
                  }
                : {}),
            });
            return;
          }
        }
      }
      const options = [
        "JP",
        "KR",
        "FR",
        "IN",
        "IR",
        "BR",
        "AR",
        "UA",
        "TH",
        "ES",
      ].filter((code) => code !== country.code && !visited[code]);
      const code = options[Math.floor(Math.random() * options.length)] || "JP";
      update({
        country: code,
        ...(seedItem && user
          ? {
              seed: String(seedItem.tmdbId),
              mode: "personal",
              intent: "Знайди близький за темами фільм з іншої країни",
            }
          : {}),
      });
    } catch {
      setNotice(
        "Не вдалося підібрати напрям. Обери країну зі списку або спробуй ще раз.",
      );
    } finally {
      setPickingCountry(false);
    }
  };
  const fallback = (
    <div className="world-globe-fallback">
      <span>◎</span>
      <h2>Світ кіно завжди поруч</h2>
      <p>Обери країну зі списку. Усі добірки доступні й без 3D.</p>
    </div>
  );
  const shortlist = countries.filter((c) =>
    c.name
      .toLocaleLowerCase("uk")
      .includes(countrySearch.trim().toLocaleLowerCase("uk")),
  );
  const atlas = (
    <section className="world-atlas" aria-label="Вибір країни">
      <aside className="world-atlas__guide">
        <div>
          <p className="eyebrow">ТВОЯ КІНОПОДОРОЖ</p>
          <h2>Куди далі?</h2>
          <p>Обертай світ і торкнися країни, щоб відкрити її кіно.</p>
        </div>
        <div className="world-destinations">
          <span>Ідеї для першої зупинки</span>
          {["UA", "JP", "FR", "KR", "KZ", "IT"].map((code) => (
            <button key={code} onClick={() => selectCountry(code)}>
              <span aria-hidden="true">{FLAG(code)}</span>
              {countries.find((c) => c.code === code)?.name}
              <span aria-hidden="true">↗</span>
            </button>
          ))}
        </div>
        <div className="world-map-legend">
          <span>
            <i /> Обрана країна
          </span>
          <span>
            <i /> Твій кінопаспорт
          </span>
        </div>
      </aside>
      <div className="world-atlas__canvas">
        {globeAvailable ? (
          <GlobeBoundary fallback={fallback}>
            <Globe
              active={!showFilms}
              country={country}
              visited={visited}
              onSelect={selectCountry}
              onUnavailable={unavailable}
            />
          </GlobeBoundary>
        ) : (
          fallback
        )}
      </div>
      <aside className="world-atlas__panel">
        <span className="world-country-flag" aria-hidden="true">
          {FLAG(country.code)}
        </span>
        <p className="eyebrow">НАСТУПНА ЗУПИНКА</p>
        <h2>{country.name}</h2>
        <p>
          Від культових історій до маленьких відкриттів. Знайди свій наступний
          фільм.
        </p>
        <button
          className="world-open-country"
          onClick={() => update({ view: "films", page: String(page) })}
        >
          {params.has("country") ? "До фільмів країни" : "Відкрити фільми"}{" "}
          <span aria-hidden="true">↗</span>
        </button>
        <label className="world-country-search">
          Знайти країну
          <input
            type="search"
            placeholder="Наприклад, Японія"
            value={countrySearch}
            onChange={(e) => setCountrySearch(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                countrySearch.trim() &&
                shortlist.length === 1
              )
                selectCountry(shortlist[0].code);
            }}
          />
        </label>
        {countrySearch.trim() && (
          <div className="world-country-matches">
            {shortlist.length ? (
              <ul aria-label="Знайдені країни">
                {shortlist.map((c) => (
                  <li key={c.code}>
                    <button onClick={() => selectCountry(c.code)}>
                      <span aria-hidden="true">{FLAG(c.code)}</span> {c.name}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p role="status">Країну не знайдено</p>
            )}
          </div>
        )}
        <button
          className="world-surprise"
          onClick={() => void pickCountry()}
          disabled={pickingCountry}
        >
          {pickingCountry
            ? "Шукаємо напрям…"
            : user
              ? "З якої країни мені почати? ↗"
              : "Здивуй країною ↗"}
        </button>
        <p className="world-atlas__note">
          Колір на карті показує країни у твоєму кінопаспорті.
        </p>
      </aside>
    </section>
  );
  return (
    <main className="page page--world">
      <Header
        active="world"
        savedCount={saved.length}
        onChange={(v) => router.push(v === "saved" ? "/saved" : "/")}
        isSearchOpen={false}
        onSearchToggle={() => router.push("/search")}
        onSearchClose={() => undefined}
      />
      <div className="world-shell" data-view={showFilms ? "films" : "globe"}>
        <header className="world-toolbar">
          <h1>
            <span aria-hidden="true">◎</span> Світ кіно{" "}
            <small>ІНТЕРАКТИВНИЙ АТЛАС</small>
          </h1>
          <button
            className="world-passport-toggle"
            onClick={() => {
              if (!user) setAuthOpen(true);
              else setPassportOpen((v) => !v);
            }}
            aria-controls="world-passport"
            aria-expanded={passportOpen}
          >
            ◎ Мій кінопаспорт{" "}
            <span>
              {passport.isFetching && !passport.data
                ? "Рахуємо…"
                : Object.keys(visited).length
                  ? Object.keys(visited).length + " країн"
                  : "Переглянуте на карті"}
            </span>
          </button>
        </header>
        {passportOpen && user && (
          <section
            className="world-passport"
            id="world-passport"
            aria-label="Мій кінопаспорт"
          >
            <button
              className="world-passport-close"
              aria-label="Закрити кінопаспорт"
              onClick={() => setPassportOpen(false)}
            >
              ×
            </button>
            <h2>Твої подорожі через кіно</h2>
            {passport.data && (
              <p className="world-passport-total">
                Переглянуто фільмів:{" "}
                <strong>{passport.data.totalWatched}</strong>
                {" · "}Країн: <strong>{Object.keys(visited).length}</strong>
              </p>
            )}
            <p>
              Враховано «Улюблене», «Сподобалось», «Переглянуто» та «Не
              сподобалось» — кожен фільм один раз. Спільні виробництва можуть
              належати кільком країнам.
            </p>
            <div className="world-passport-stamps">
              {Object.entries(visited)
                .sort((a, b) => b[1] - a[1])
                .map(([code, count]) => (
                  <button key={code} onClick={() => selectCountry(code)}>
                    {FLAG(code)}{" "}
                    {countries.find((c) => c.code === code)?.name ?? code}
                    <strong>{count}</strong>
                  </button>
                ))}
            </div>
            {passport.isFetching && (
              <p role="status">
                {passport.data
                  ? "Оновлюємо статистику…"
                  : "Рахуємо всі переглянуті фільми…"}
              </p>
            )}
            {!passport.isFetching && passport.data?.totalWatched === 0 && (
              <p>Перший штамп з’явиться після позначки «Переглянуто».</p>
            )}
            {passport.error && (
              <p role="alert">
                {passport.error.message}{" "}
                <button onClick={() => void passport.refetch()}>
                  Повторити
                </button>
              </p>
            )}
            {(passport.data?.missing ?? 0) > 0 && (
              <p>Без даних про країну: {passport.data?.missing} фільмів.</p>
            )}
          </section>
        )}
        <WorldPanels
          showFilms={showFilms}
          onBack={returnToGlobe}
          country={country.code}
          atlas={atlas}
          title={
            <h2 id="world-results-title">
              <span aria-hidden="true">{FLAG(country.code)}</span>{" "}
              {country.name}
            </h2>
          }
          actions={
            <button
              className="world-route-toggle"
              onClick={() => setRouteOpen((v) => !v)}
              disabled={items.length < 3}
              aria-expanded={routeOpen}
              aria-label="Маршрут із 3 фільмів"
            >
              3 фільми ↗
            </button>
          }
        >
          <section
            className="world-cinema"
            aria-labelledby="world-results-title"
          >
            <div className="world-discovery-controls">
              <div
                className="world-modes"
                role="group"
                aria-label="Тип добірки"
              >
                {MODES.map(([id, label]) => (
                  <button
                    key={id}
                    aria-pressed={mode === id}
                    onClick={() => {
                      update({ mode: id });
                      if (id === "personal" && !user) setAuthOpen(true);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                className="world-filter-toggle"
                aria-expanded={filtersOpen}
                aria-controls="world-filter-panel"
                onClick={() => setFiltersOpen((v) => !v)}
              >
                Фільтри
                {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
              </button>
            </div>
            <div
              id="world-filter-panel"
              className="world-filter-panel"
              hidden={!filtersOpen}
            >
              <div className="world-filters">
                <label>
                  Жанр
                  <select
                    value={genre}
                    onChange={(e) => update({ genre: e.target.value })}
                  >
                    <option value="">Усі жанри</option>
                    {GENRES.map(([id, label]) => (
                      <option key={id} value={id}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Епоха
                  <select
                    value={decade}
                    onChange={(e) => update({ decade: e.target.value })}
                  >
                    <option value="">Усі роки</option>
                    {Array.from({ length: 12 }, (_, i) => 2020 - i * 10).map(
                      (y) => (
                        <option key={y} value={y}>
                          {y}-ті
                        </option>
                      ),
                    )}
                  </select>
                </label>
                <label>
                  Тривалість
                  <select
                    value={runtime}
                    onChange={(e) => update({ runtime: e.target.value })}
                  >
                    <option value="">Будь-яка</option>
                    <option value="90">До 90 хв</option>
                    <option value="120">До 2 годин</option>
                    <option value="150">До 2,5 годин</option>
                    {runtime && !["90", "120", "150"].includes(runtime) && (
                      <option value={runtime}>До {runtime} хв</option>
                    )}
                  </select>
                </label>
                <label className="world-checkbox">
                  <input
                    type="checkbox"
                    checked={hideWatched}
                    onChange={(e) =>
                      update({ hideWatched: e.target.checked ? "1" : "0" })
                    }
                  />
                  Без переглянутого
                </label>
                <label
                  className="world-checkbox"
                  title={
                    services.ids.length
                      ? "Використовує сервіси, обрані в «Де дивитися»"
                      : "Познач сервіси в «Де дивитися» на сторінці фільму"
                  }
                >
                  <input
                    type="checkbox"
                    checked={onlyServices}
                    disabled={!services.ids.length}
                    onChange={(e) =>
                      update({ services: e.target.checked ? "1" : "0" })
                    }
                  />
                  Мої сервіси · {services.region}
                </label>
              </div>
              <p className="world-method">
                {mode === "top"
                  ? "Добірка за оцінками TMDB з урахуванням кількості голосів."
                  : mode === "gems"
                    ? "Фільми з оцінкою від 6,5 і 10–1500 голосами в TMDB."
                    : mode === "personal"
                      ? query.data?.aiUsed
                        ? "Відібрано за твоїм смаком за допомогою AI."
                        : "Добірка за твоїми вподобаннями. AI доповнює її, коли доступний."
                      : "Популярність фільмів у TMDB, а не рейтинг глядачів цієї країни."}{" "}
                Країна означає походження фільму; це не країна доступності
                перегляду.
              </p>
            </div>
            {intent && (
              <p className="world-notice">
                Уточнення: {intent}{" "}
                <button onClick={() => update({ seed: "", intent: "" })}>
                  Прибрати ×
                </button>
                {query.isSuccess && !query.data?.aiUsed && (
                  <span>
                    {" "}
                    · AI-уточнення зараз недоступне; показано базову добірку.
                  </span>
                )}
              </p>
            )}
            {notice && (
              <p role="status" className="world-notice">
                {notice}
              </p>
            )}
            {mode === "personal" && !user ? (
              <div className="world-empty">
                <h3>Познайомимося ближче?</h3>
                <p>Увійди, щоб знаходити кіно цієї країни під свій смак.</p>
                <button onClick={() => setAuthOpen(true)}>Увійти</button>{" "}
                <button
                  onClick={() => update({ mode: "top", seed: "", intent: "" })}
                >
                  Дивитися добірку країни без входу
                </button>
              </div>
            ) : null}
            {query.isLoading && (
              <div className="world-grid" aria-label="Завантаження фільмів">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="world-card-skeleton" />
                ))}
              </div>
            )}
            {query.error && (mode !== "personal" || user) && (
              <div className="world-empty" role="alert">
                <p>{query.error.message}</p>
                <button onClick={() => void query.refetch()}>
                  Спробувати ще раз
                </button>{" "}
                {mode === "personal" && (
                  <button
                    onClick={() =>
                      update({ mode: "top", seed: "", intent: "" })
                    }
                  >
                    Перейти до найкраще оцінених
                  </button>
                )}
              </div>
            )}
            {query.data?.partial && (
              <p role="status">
                Частина даних тимчасово недоступна. Показуємо те, що вдалося
                завантажити.
              </p>
            )}
            {routeOpen && route.length === 3 && (
              <div className="world-route">
                <p className="eyebrow">ТРИ ВЕЧОРИ — ОДНА КІНОПОДОРОЖ</p>
                {route.map((item, i) => (
                  <div className="world-route-card" key={item.tmdbId}>
                  <MovieInfoButton tmdbId={item.tmdbId} mediaType="movie" title={item.title} />
                  <Link href={`/title/movie/${item.tmdbId}`}>
                    <span>0{i + 1}</span>
                    <div>
                      <small>
                        {
                          [
                            "Знайомство: найбільше відгуків",
                            "Продовження: висока оцінка",
                            "Відкриття: менше відоме",
                          ][i]
                        }
                      </small>
                      <strong>{item.title}</strong>
                    </div>
                    <span>↗</span>
                  </Link>
                  </div>
                ))}
              </div>
            )}
            <div className="world-grid">
              {items.map((item) => {
                const active = getListTypes({
                  id: item.tmdbId,
                  mediaType: item.mediaType,
                  title: item.title,
                });
                return (
                  <article className="world-card" key={itemKey(item)}>
                    <MovieInfoButton tmdbId={item.tmdbId} mediaType={item.mediaType} title={item.title} activeLists={active} />
                    <Link
                      className="world-card__poster"
                      href={`/title/${item.mediaType}/${item.tmdbId}`}
                      onClick={() =>
                        track("recommendation_opened", {
                          surface: "world",
                          tmdbId: item.tmdbId,
                          country: country.code,
                        })
                      }
                    >
                      {item.posterUrl && (
                        <CoverImage
                          src={item.posterUrl}
                          alt={item.title}
                          sizes="(max-width:550px) 45vw, (max-width:800px) 30vw, (max-width:1200px) 23vw, 19vw"
                        />
                      )}
                      <span className="world-card__rating">
                        ★ {item.rating?.toFixed(1) ?? "—"}{" "}
                        <small>{item.voteCount ?? 0} голосів</small>
                      </span>
                    </Link>
                    <div className="world-card__body">
                      <Link href={`/title/${item.mediaType}/${item.tmdbId}`}>
                        <h3>{item.title}</h3>
                      </Link>
                      <p className="world-card__meta">
                        {item.year}
                        {item.runtime ? ` · ${item.runtime} хв` : ""}
                        {item.genres?.[0] ? ` · ${item.genres[0]}` : ""}
                      </p>
                      <p className="world-card__reason">{item.reason}</p>
                      <div className="world-card__actions">
                        <button
                          aria-pressed={active.includes("watchlist")}
                          onClick={() => void mark(item, "watchlist")}
                        >
                          {active.includes("watchlist")
                            ? "Збережено ✓"
                            : "+ Зберегти"}
                        </button>
                        <button onClick={() => void mark(item, "watched")}>
                          Вже бачив
                        </button>
                      </div>
                      <details className="world-refine">
                        <summary>Цей, але…</summary>
                        <div>
                          <button
                            onClick={() =>
                              update({
                                runtime: String(
                                  Math.max(60, (item.runtime || 120) - 15),
                                ),
                              })
                            }
                          >
                            Коротший
                          </button>
                          <button
                            onClick={() => {
                              if (!user) {
                                setAuthOpen(true);
                                return;
                              }
                              update({
                                seed: String(item.tmdbId),
                                intent:
                                  "Схоже за темами, але легше та менш похмуре",
                                mode: "personal",
                              });
                            }}
                          >
                            Менш похмурий
                          </button>
                          <button onClick={() => void pickCountry(item)}>
                            З іншої країни
                          </button>
                        </div>
                      </details>
                      <div className="world-card__feedback">
                        <button
                          disabled={busy === itemKey(item)}
                          onClick={() => void feedback(item, "liked")}
                        >
                          Цікаво
                        </button>
                        <button
                          disabled={busy === itemKey(item)}
                          onClick={() => void feedback(item, "disliked")}
                        >
                          Не моє
                        </button>
                        <button
                          onClick={() => {
                            setHidden((v) => [...v, itemKey(item)]);
                            track("recommendation_feedback", {
                              surface: "world",
                              action: "not_today",
                              tmdbId: item.tmdbId,
                            });
                          }}
                        >
                          Не сьогодні
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            {query.isSuccess && !items.length && (
              <div className="world-empty">
                <h3>Тут ще є що відкривати</h3>
                <p>
                  За цими умовами фільмів немає. Спробуй прибрати фільтри або
                  відкрити наступну добірку.
                </p>
                <button
                  onClick={() => {
                    setHidden([]);
                    update({
                      genre: "",
                      decade: "",
                      runtime: "",
                      services: "",
                      hideWatched: "0",
                      page: "1",
                    });
                  }}
                >
                  Скинути фільтри
                </button>
              </div>
            )}
            {query.isSuccess && page < 10 && (
              <button
                className="world-more"
                onClick={() => update({ page: String(page + 1) })}
              >
                Наступна добірка →
              </button>
            )}
            <footer className="world-credit">
              Фільми: TMDB · Доступність: JustWatch через TMDB · Геодані:
              Natural Earth / world-atlas
            </footer>
          </section>
        </WorldPanels>
      </div>
      <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} />
    </main>
  );
}

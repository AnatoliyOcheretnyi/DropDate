"use client";

import { useRouter } from "next/navigation";
import { Header } from "../../../widgets/Header";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { useCalendarReleases } from "../hooks/useCalendarReleases";
import { CalendarMonthView } from "../components/CalendarMonthView";
import { CalendarWeekView } from "../components/CalendarWeekView";

export function CalendarScreen() {
  const router = useRouter();
  const { savedCount } = useSavedReleases();
  const {
    mode,
    setMode,
    weekDays,
    monthWeeks,
    weekdayLabels,
    periodLabel,
    periodEventCount,
    upcomingCount,
    totalCount,
    isReady,
    isTodayInView,
    goPrev,
    goNext,
    goToday,
    focusDay,
  } = useCalendarReleases();

  const periodNoun =
    periodEventCount === 1
      ? "реліз"
      : periodEventCount >= 2 && periodEventCount <= 4
        ? "релізи"
        : "релізів";

  return (
    <main className="page page--calendar">
      <Header
        active="calendar"
        savedCount={savedCount}
        onChange={(view) => router.push(view === "saved" ? "/saved" : "/")}
        isSearchOpen={false}
        onSearchToggle={() => router.push("/")}
        onSearchClose={() => undefined}
      />

      <section className="calendar">
        <div className="calendar-hero">
          <div className="calendar-hero-copy">
            <p className="eyebrow">Календар релізів</p>
            <h1>Мої підписки за датами</h1>
            <p>
              Усе, за чим ти стежиш, розкладено по днях — щоб не пропустити
              жодної прем&apos;єри чи нової серії.
            </p>
          </div>
          <div className="calendar-hero-side">
            <div className="calendar-stat">
              <strong>{upcomingCount}</strong>
              <span>попереду</span>
            </div>
            <div className="calendar-stat">
              <strong>{totalCount}</strong>
              <span>усього з датою</span>
            </div>
          </div>
        </div>

        <div className="calendar-toolbar">
          <div className="calendar-nav">
            <button
              type="button"
              className="calendar-nav-btn"
              onClick={goPrev}
              aria-label="Попередній період"
            >
              ‹
            </button>
            <span className="calendar-period">{periodLabel}</span>
            <button
              type="button"
              className="calendar-nav-btn"
              onClick={goNext}
              aria-label="Наступний період"
            >
              ›
            </button>
            <button
              type="button"
              className="calendar-today-btn"
              onClick={goToday}
              disabled={isTodayInView}
            >
              Сьогодні
            </button>
          </div>

          <div className="calendar-mode" role="tablist" aria-label="Режим перегляду">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "week"}
              className={`calendar-mode-btn${mode === "week" ? " active" : ""}`}
              onClick={() => setMode("week")}
            >
              Тиждень
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "month"}
              className={`calendar-mode-btn${mode === "month" ? " active" : ""}`}
              onClick={() => setMode("month")}
            >
              Місяць
            </button>
          </div>
        </div>

        <p className="calendar-summary">
          {periodEventCount} {periodNoun} у цьому періоді
        </p>

        {!isReady ? (
          <div className="calendar-empty">
            <p>Завантажуємо твій список…</p>
          </div>
        ) : totalCount === 0 ? (
          <div className="calendar-empty">
            <span aria-hidden="true">🗓️</span>
            <h2>Календар поки порожній</h2>
            <p>
              Додай серіали та фільми до підписок або списку перегляду — і їхні
              дати релізів зʼявляться тут.
            </p>
            <button type="button" onClick={() => router.push("/saved")}>
              До мого списку
            </button>
          </div>
        ) : mode === "week" ? (
          <CalendarWeekView days={weekDays} />
        ) : (
          <CalendarMonthView
            weeks={monthWeeks}
            weekdayLabels={weekdayLabels}
            onSelectDay={focusDay}
          />
        )}
      </section>
    </main>
  );
}

"use client";

import { useState } from "react";

type ReleaseInfo = {
  title: string;
  type: string;
  nextRelease: string;
  source: string;
};

export default function HomePage() {
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [release, setRelease] = useState<ReleaseInfo | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Введи назву серіалу або фільму.");
      setRelease(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/next-release?title=${encodeURIComponent(trimmedTitle)}`);
      const payload = await response.json();

      if (!response.ok) {
        setRelease(null);
        setError(payload?.message || "Не вдалося отримати дані.");
        return;
      }

      setRelease(payload as ReleaseInfo);
    } catch (fetchError) {
      setRelease(null);
      setError(fetchError instanceof Error ? fetchError.message : "Щось пішло не так.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="page">
      <section className="hero">
        <p className="eyebrow">beta</p>
        <h1>DropDate</h1>
        <p className="lead">
          Вводиш назву — отримуєш дату наступного релізу. Простий спосіб не прогавити нову серію.
        </p>
      </section>

      <section className="search">
        <form className="search-form" onSubmit={handleSubmit}>
          <label htmlFor="title">Назва</label>
          <div className="search-input-group">
            <input
              id="title"
              name="title"
              type="text"
              placeholder="Наприклад, Dune"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              autoComplete="off"
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? "Шукаємо…" : "Знайти"}
            </button>
          </div>
        </form>
        {error && <p className="error">{error}</p>}
      </section>

      {release && (
        <section className="result">
          <article className="card">
            <p className="card-label">Наступний реліз</p>
            <h2>{release.title}</h2>
            {(() => {
              const releaseDate = new Date(release.nextRelease);
              const formattedDate = releaseDate.toLocaleDateString("uk-UA", {
                day: "numeric",
                month: "long",
                year: "numeric"
              });
              const formattedWeekday = releaseDate.toLocaleDateString("uk-UA", {
                weekday: "long"
              });
              return (
                <dl>
                  <div>
                    <dt>Тип</dt>
                    <dd>{release.type}</dd>
                  </div>
                  <div>
                    <dt>Дата</dt>
                    <dd className="date">
                      <span>{formattedDate}</span>
                      <span>{formattedWeekday}</span>
                    </dd>
                  </div>
                  <div>
                    <dt>Джерело</dt>
                    <dd>{release.source}</dd>
                  </div>
                </dl>
              );
            })()}
          </article>
        </section>
      )}
    </main>
  );
}

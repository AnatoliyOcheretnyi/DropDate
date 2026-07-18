"use client";

import { useRouter } from "next/navigation";
import { AppPageShell } from "../../../widgets/AppPageShell";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { changelogEntries } from "../data/releases";

export function ChangelogScreen() {
  const router = useRouter();
  const { savedCount } = useSavedReleases();

  return (
    <main className="page page--profile">
      <AppPageShell
        active="home"
        savedCount={savedCount}
        onChange={(view) => router.push(view === "saved" ? "/saved" : "/")}
        isSearchOpen={false}
        onSearchToggle={() => router.push("/")}
        onSearchClose={() => undefined}
      >
        <section className="changelog-page">
          <div className="changelog-hero">
            <p className="eyebrow">Що нового</p>
            <h1>Changelog DropDate</h1>
            <p>
              Тут зібрані зміни по веб-версії DropDate: що реально з’явилося в
              продукті, без технічних bump-ів, які нічого не змінювали для
              користувача.
            </p>
          </div>

          <div className="changelog-list">
            {changelogEntries.map((entry) => (
              <article key={entry.version} className="changelog-card">
                <div className="changelog-card__head">
                  <div>
                    <p className="changelog-card__date">{entry.releasedAt}</p>
                    <h2>{entry.version}</h2>
                    <strong>{entry.title}</strong>
                  </div>
                  <div className="changelog-card__versions">
                    {entry.frontendVersion ? (
                      <span>Frontend {entry.frontendVersion}</span>
                    ) : null}
                    {entry.backendVersion ? (
                      <span>Backend {entry.backendVersion}</span>
                    ) : null}
                  </div>
                </div>

                <p className="changelog-card__summary">{entry.summary}</p>

                <div className="changelog-card__grid">
                  <section className="changelog-section">
                    <p className="trend-kicker">Frontend</p>
                    <ul>
                      {entry.frontend.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>

                  <section className="changelog-section">
                    <p className="trend-kicker">Backend</p>
                    <ul>
                      {entry.backend.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                </div>
              </article>
            ))}
          </div>
        </section>
      </AppPageShell>
    </main>
  );
}

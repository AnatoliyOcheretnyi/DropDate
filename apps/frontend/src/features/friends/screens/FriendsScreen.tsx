"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppPageShell } from "../../../widgets/AppPageShell";
import { useAuth } from "../../../shared/state/auth";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { useFriends } from "../hooks/useFriends";
import { useFriendSearch } from "../hooks/useFriendSearch";
import { FriendSearchBar } from "../components/FriendSearchBar";
import { FriendRequestRow } from "../components/FriendRequestRow";
import { FriendCard } from "../components/FriendCard";

type TabKey = "friends" | "incoming" | "outgoing";

export function FriendsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { savedCount } = useSavedReleases();
  const { friends, incoming, outgoing, isLoading, sendRequest, respond, remove } = useFriends();
  const { query, setQuery, results, isSearching, hasSearched, minQueryLength } =
    useFriendSearch();
  const [tab, setTab] = useState<TabKey>("friends");

  // Land the user on the tab that needs attention: fresh incoming requests
  // beat an empty friends grid.
  useEffect(() => {
    if (incoming.length > 0 && friends.length === 0) {
      setTab("incoming");
    }
  }, [incoming.length, friends.length]);

  const tabs: { key: TabKey; label: string; count: number; alert?: boolean }[] = [
    { key: "friends", label: "Друзі", count: friends.length },
    { key: "incoming", label: "Вхідні", count: incoming.length, alert: incoming.length > 0 },
    { key: "outgoing", label: "Надіслані", count: outgoing.length },
  ];

  return (
    <main className="page page--friends">
      <AppPageShell
        active="home"
        savedCount={savedCount}
        onChange={(view) => router.push(view === "saved" ? "/saved" : "/")}
        isSearchOpen={false}
        onSearchToggle={() => undefined}
        onSearchClose={() => undefined}
      >
        <div className="friends-backdrop" aria-hidden="true" />
        <section className="friends-shell">
          <div className="friends-hero">
            <div className="friends-hero__copy">
              <p className="eyebrow">Соціальне</p>
              <h1>Друзі</h1>
              <p>Додай друга — побач, що він дивиться, і які нагороди розблокував.</p>
            </div>
            {user ? (
              <div className="friends-hero__search">
                <FriendSearchBar
                  query={query}
                  onQueryChange={setQuery}
                  results={results}
                  isSearching={isSearching}
                  hasSearched={hasSearched}
                  minQueryLength={minQueryLength}
                  onSendRequest={sendRequest}
                />
              </div>
            ) : null}
          </div>

          {!user ? (
            <div className="friends-empty">Увійди, щоб додавати друзів.</div>
          ) : (
            <>
              <div className="friend-seg" role="tablist" aria-label="Розділи друзів">
                {tabs.map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    role="tab"
                    aria-selected={tab === entry.key}
                    className={tab === entry.key ? "is-active" : ""}
                    onClick={() => setTab(entry.key)}
                  >
                    {entry.label}
                    {entry.count > 0 ? (
                      <span className={`friend-seg__badge${entry.alert ? " friend-seg__badge--alert" : ""}`}>
                        {entry.count}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>

              {tab === "friends" ? (
                <div className="friend-tab-panel" key="friends">
                  {isLoading ? (
                    <div className="friends-grid">
                      {[0, 1, 2, 3, 4].map((key) => (
                        <div key={key} className="friend-card friend-card--loading" aria-hidden="true" />
                      ))}
                    </div>
                  ) : friends.length === 0 ? (
                    <div className="friends-empty friends-empty--cta">
                      <span className="friends-empty__icon" aria-hidden="true">
                        🤝
                      </span>
                      <strong>Поки немає друзів</strong>
                      <p>Знайди когось через пошук угорі й надішли перший запит.</p>
                    </div>
                  ) : (
                    <div className="friends-grid">
                      {friends.map((friendship, index) => (
                        <div
                          key={friendship.id}
                          className="friend-stagger-in"
                          style={{ animationDelay: `${index * 45}ms` }}
                        >
                          <FriendCard friendship={friendship} onRemove={(id) => remove(id)} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {tab === "incoming" ? (
                <div className="friend-tab-panel" key="incoming">
                  {incoming.length === 0 ? (
                    <div className="friends-empty friends-empty--cta">
                      <span className="friends-empty__icon" aria-hidden="true">
                        📥
                      </span>
                      <strong>Немає вхідних запитів</strong>
                      <p>Коли хтось захоче додати тебе в друзі — запит з&apos;явиться тут.</p>
                    </div>
                  ) : (
                    <div className="friend-request-list">
                      {incoming.map((friendship, index) => (
                        <div
                          key={friendship.id}
                          className="friend-stagger-in"
                          style={{ animationDelay: `${index * 60}ms` }}
                        >
                          <FriendRequestRow
                            friendship={friendship}
                            direction="incoming"
                            onAccept={(id) => respond({ friendshipId: id, accept: true })}
                            onDecline={(id) => respond({ friendshipId: id, accept: false })}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {tab === "outgoing" ? (
                <div className="friend-tab-panel" key="outgoing">
                  {outgoing.length === 0 ? (
                    <div className="friends-empty friends-empty--cta">
                      <span className="friends-empty__icon" aria-hidden="true">
                        📤
                      </span>
                      <strong>Немає надісланих запитів</strong>
                      <p>Запити, які чекають на відповідь, житимуть тут.</p>
                    </div>
                  ) : (
                    <div className="friend-request-list">
                      {outgoing.map((friendship, index) => (
                        <div
                          key={friendship.id}
                          className="friend-stagger-in"
                          style={{ animationDelay: `${index * 60}ms` }}
                        >
                          <FriendRequestRow
                            friendship={friendship}
                            direction="outgoing"
                            onCancel={(id) => remove(id)}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </>
          )}
        </section>
      </AppPageShell>
    </main>
  );
}

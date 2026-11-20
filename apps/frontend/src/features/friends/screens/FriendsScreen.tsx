"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AppPageShell } from "../../../widgets/AppPageShell";
import { AuthModal } from "../../../widgets/AuthModal";
import { useAuth } from "../../../shared/state/auth";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { useFriends } from "../hooks/useFriends";
import { useFriendSearch } from "../hooks/useFriendSearch";
import { FriendSearchBar } from "../components/FriendSearchBar";
import { FriendRequestRow } from "../components/FriendRequestRow";
import { FriendCard } from "../components/FriendCard";
import { FriendAvatar } from "../components/FriendAvatar";

type TabKey = "friends" | "incoming" | "outgoing";
type SortKey = "mutual" | "name" | "recent";
const COPY = {
  friends: {
    title: "Моє коло",
    description:
      "У кожного свій смак. Знайдіть наступний улюблений фільм разом.",
    empty: "Тут починається твоє кіноколо",
    hint: "Знайди друга за ім’ям або email. Його списки та ваші спільні фільми з’являться тут.",
  },
  incoming: {
    title: "Запити у друзі",
    description: "Люди, які хочуть ділитися з тобою своїм кіносвітом.",
    empty: "Усі запити переглянуто",
    hint: "Нові запрошення з’являться тут. А поки можна знайти друзів самостійно.",
  },
  outgoing: {
    title: "Надіслані запити",
    description: "Твої запрошення, які ще чекають на відповідь.",
    empty: "Немає запитів в очікуванні",
    hint: "Надішли запрошення людині, з якою хочеш обмінюватися кінознахідками.",
  },
};

export function FriendsScreen() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { savedCount } = useSavedReleases();
  const {
    friends,
    incoming,
    outgoing,
    isLoading,
    isRefreshing,
    error,
    refresh,
    sendRequest,
    respond,
    remove,
    isResponding,
    isRemoving,
  } = useFriends();
  const search = useFriendSearch();
  const [tab, setTab] = useState<TabKey>("friends");
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<SortKey>("mutual");
  const [loginOpen, setLoginOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
    "idle",
  );
  const searchRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const busy = isResponding || isRemoving;
  const loading = authLoading || isLoading;
  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "friends", label: "Друзі", count: friends.length },
    { key: "incoming", label: "Запити", count: incoming.length },
    { key: "outgoing", label: "Надіслані", count: outgoing.length },
  ];
  const filtered = useMemo(
    () =>
      friends
        .filter((friend) =>
          `${friend.user.username} ${friend.user.email}`
            .toLocaleLowerCase("uk")
            .includes(filter.trim().toLocaleLowerCase("uk")),
        )
        .sort((a, b) => {
          if (sort === "name")
            return (a.user.username || a.user.email).localeCompare(
              b.user.username || b.user.email,
              "uk",
            );
          if (sort === "recent")
            return (b.respondedAt || b.createdAt).localeCompare(
              a.respondedAt || a.createdAt,
            );
          return (b.mutualTitles ?? 0) - (a.mutualTitles ?? 0);
        }),
    [friends, filter, sort],
  );
  const focusSearch = () => searchRef.current?.querySelector("input")?.focus();
  const openRequests = () => {
    setTab("incoming");
    document.getElementById("friends-tab-incoming")?.focus({ preventScroll: true });
    panelRef.current?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };
  const handleRequest = async (
    id: string,
    action: "accept" | "decline" | "cancel",
  ) => {
    setActionError("");
    setMessage("");
    try {
      if (action === "cancel") await remove(id);
      else await respond({ friendshipId: id, accept: action === "accept" });
      setMessage(
        action === "accept"
          ? "Запит прийнято. Друг уже у твоєму колі."
          : action === "decline"
            ? "Запит відхилено."
            : "Запрошення скасовано.",
      );
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Не вдалося виконати дію. Спробуй ще раз.",
      );
    }
  };
  const copyUsername = async () => {
    try {
      await navigator.clipboard.writeText(user?.username ?? "");
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  };
  const current = COPY[tab];
  const empty =
    tab === "friends"
      ? filtered.length === 0
      : tab === "incoming"
        ? incoming.length === 0
        : outgoing.length === 0;

  return (
    <main className="page page--friends">
      <AppPageShell
        active="home"
        savedCount={savedCount}
        onChange={(view) => router.push(view === "saved" ? "/saved" : "/")}
        isSearchOpen={false}
        onSearchToggle={() => router.push("/search")}
        onSearchClose={() => undefined}
      >
        <div className="friends-backdrop" aria-hidden="true" />
        <div className="friends-shell friends-hub">
          <header className="friends-welcome">
            <div className="friends-welcome__copy">
              <p className="friends-eyebrow">ДРУЗІ У DROPDATE</p>
              <h1>Кіно зближує.</h1>
              <p className="friends-welcome__description">
                Знаходь своїх людей, зазирай у їхні списки
                <br className="friends-desktop-break" /> й обмінюйся тим, що
                варто подивитися.
              </p>
              <div className="friends-welcome__actions">
                <button
                  className="friends-primary"
                  type="button"
                  onClick={user ? focusSearch : () => setLoginOpen(true)}
                >
                  <span aria-hidden="true">＋</span>
                  {user ? "Знайти друга" : "Приєднатися"}
                </button>
                {user && (
                  <Link
                    className="friends-activity-link"
                    href="/friends/activity"
                  >
                    Активність і спільні списки{" "}
                    <span aria-hidden="true">↗</span>
                  </Link>
                )}
              </div>
            </div>
            <div className="friends-welcome__aside">
              <div className="friends-avatar-stack" aria-hidden="true">
                {friends.length ? (
                  friends
                    .slice(0, 3)
                    .map((friend) => (
                      <FriendAvatar
                        key={friend.id}
                        label={friend.user.username || friend.user.email}
                        size="lg"
                      />
                    ))
                ) : (
                  <>
                    <span className="friends-orbit-mark">✳</span>
                    <span className="friends-orbit-mark">↗</span>
                    <span className="friends-orbit-mark">✦</span>
                  </>
                )}
              </div>
              <p>
                {loading ? (
                  "Збираємо твоє коло…"
                ) : friends.length ? (
                  <>
                    <strong>{friends.length}</strong> у твоєму кіноколі
                  </>
                ) : (
                  "Хороші фільми. Свої люди."
                )}
              </p>
              {incoming.length > 0 && (
                <button
                  type="button"
                  className="friends-request-callout"
                  onClick={openRequests}
                >
                  <span className="friends-notification-dot" />
                  Нові запити: {incoming.length}
                  <span aria-hidden="true">→</span>
                </button>
              )}
            </div>
          </header>
          {!user && !authLoading ? (
            <section className="friends-guest">
              <span className="friends-empty-mark" aria-hidden="true">
                ◎
              </span>
              <h2>Твоє коло чекає на тебе</h2>
              <p>
                Увійди, щоб знаходити друзів, порівнювати смаки й обирати кіно
                на вечір.
              </p>
              <button
                type="button"
                className="friends-primary"
                onClick={() => setLoginOpen(true)}
              >
                Увійти в акаунт
              </button>
            </section>
          ) : (
            <div className="friends-workspace">
              <section className="friends-main" ref={panelRef}>
                <div
                  className="friends-tabs"
                  role="tablist"
                  aria-label="Розділи друзів"
                >
                  {tabs.map((entry, index) => (
                    <button
                      type="button"
                      key={entry.key}
                      id={`friends-tab-${entry.key}`}
                      role="tab"
                      aria-controls="friends-panel"
                      aria-selected={tab === entry.key}
                      tabIndex={tab === entry.key ? 0 : -1}
                      onClick={() => setTab(entry.key)}
                      onKeyDown={(event) => {
                        const target =
                          event.key === "ArrowRight"
                            ? (index + 1) % tabs.length
                            : event.key === "ArrowLeft"
                              ? (index + tabs.length - 1) % tabs.length
                              : event.key === "Home"
                                ? 0
                                : event.key === "End"
                                  ? tabs.length - 1
                                  : -1;
                        if (target >= 0) {
                          event.preventDefault();
                          setTab(tabs[target].key);
                          document
                            .getElementById(`friends-tab-${tabs[target].key}`)
                            ?.focus();
                        }
                      }}
                    >
                      <span>{entry.label}</span>
                      <span
                        className={
                          entry.key === "incoming" && entry.count
                            ? "friends-tabs__count friends-tabs__count--new"
                            : "friends-tabs__count"
                        }
                      >
                        {loading ? "—" : entry.count}
                      </span>
                    </button>
                  ))}
                </div>
                <div
                  className="friends-feedback"
                  role="status"
                  aria-live="polite"
                >
                  {message ||
                    (isRefreshing && !isLoading ? "Оновлюємо твоє коло…" : "")}
                </div>
                {(error || actionError) && (
                  <div className="friends-error" role="alert">
                    <span>{actionError || error}</span>
                    {error && (
                      <button
                        type="button"
                        disabled={isRefreshing}
                        onClick={() => void refresh()}
                      >
                        Повторити
                      </button>
                    )}
                  </div>
                )}
                <div
                  role="tabpanel"
                  id="friends-panel"
                  aria-labelledby={`friends-tab-${tab}`}
                  aria-busy={loading}
                  className="friends-panel"
                >
                  <div className="friends-panel__heading">
                    <div>
                      <h2>{current.title}</h2>
                      <p>{current.description}</p>
                    </div>
                  </div>
                  {tab === "friends" && friends.length > 0 && (
                    <div className="friends-tools">
                      <label className="friends-filter">
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <circle cx="10.5" cy="10.5" r="6.5" />
                          <path d="m16 16 5 5" />
                        </svg>
                        <input
                          type="search"
                          placeholder="Пошук у твоєму колі"
                          aria-label="Пошук серед друзів"
                          value={filter}
                          onChange={(event) => setFilter(event.target.value)}
                        />
                      </label>
                      <label className="friends-sort">
                        <select
                          aria-label="Сортування друзів"
                          value={sort}
                          onChange={(event) =>
                            setSort(event.target.value as SortKey)
                          }
                        >
                          <option value="mutual">Більше спільного</option>
                          <option value="name">За ім’ям</option>
                          <option value="recent">Нещодавно додані</option>
                        </select>
                      </label>
                    </div>
                  )}
                  {loading ? (
                    <div
                      className="friends-grid"
                      aria-label="Завантажуємо друзів"
                    >
                      {[0, 1, 2, 3].map((id) => (
                        <div
                          className="friend-card friend-card--loading"
                          key={id}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                  ) : empty ? (
                    !error && (
                      <div className="friends-zero" key={tab}>
                        <span className="friends-empty-mark" aria-hidden="true">
                          {tab === "friends"
                            ? "◎"
                            : tab === "incoming"
                              ? "↙"
                              : "↗"}
                        </span>
                        <h3>
                          {filter && tab === "friends"
                            ? "Нікого з таким ім’ям"
                            : current.empty}
                        </h3>
                        <p>
                          {filter && tab === "friends"
                            ? "Спробуй інше ім’я або повернися до всього кола."
                            : current.hint}
                        </p>
                        <button
                          type="button"
                          className="friends-primary"
                          onClick={
                            filter && tab === "friends"
                              ? () => setFilter("")
                              : focusSearch
                          }
                        >
                          {filter && tab === "friends"
                            ? "Показати всіх друзів"
                            : "Знайти друга"}
                        </button>
                      </div>
                    )
                  ) : tab === "friends" ? (
                    <div className="friends-grid">
                      {filtered.map((friend, index) => (
                        <div
                          key={friend.id}
                          className="friend-stagger-in"
                          style={{
                            animationDelay: `${Math.min(index, 5) * 45}ms`,
                          }}
                        >
                          <FriendCard friendship={friend} onRemove={remove} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="friend-request-list">
                      {(tab === "incoming" ? incoming : outgoing).map(
                        (friend) => (
                          <FriendRequestRow
                            key={friend.id}
                            friendship={friend}
                            direction={tab}
                            isBusy={busy}
                            onAccept={(id) => void handleRequest(id, "accept")}
                            onDecline={(id) =>
                              void handleRequest(id, "decline")
                            }
                            onCancel={(id) => void handleRequest(id, "cancel")}
                          />
                        ),
                      )}
                    </div>
                  )}
                </div>
              </section>
              <aside
                className="friends-sidebar"
                aria-label="Знайти та запросити друзів"
              >
                <section className="friends-find" ref={searchRef}>
                  <span className="friends-section-icon" aria-hidden="true">
                    ＋
                  </span>
                  <h2>Знайди своїх</h2>
                  <p>
                    Введи ім’я користувача або email людини, яку хочеш додати.
                  </p>
                  <FriendSearchBar
                    {...search}
                    onQueryChange={search.setQuery}
                    onSendRequest={sendRequest}
                    onViewRequests={openRequests}
                  />
                  <p className="friends-find__hint">
                    Запит можна скасувати, поки його не прийняли.
                  </p>
                </section>
                <section className="friends-identity">
                  <span className="friends-eyebrow">ЯК ТЕБЕ ЗНАЙТИ</span>
                  {user?.username ? (
                    <>
                      <strong>@{user.username}</strong>
                      <p>
                        Поділися своїм іменем — нехай друзі знайдуть тебе у
                        DropDate.
                      </p>
                      <button
                        type="button"
                        className="friends-copy"
                        onClick={() => void copyUsername()}
                      >
                        {copyState === "copied"
                          ? "✓ Ім’я скопійовано"
                          : "Скопіювати ім’я"}
                      </button>
                      <span role="status" className="friends-copy-status">
                        {copyState === "error"
                          ? "Не вдалося скопіювати. Виділи ім’я вище й скопіюй вручну."
                          : copyState === "copied"
                            ? "Можна надіслати другу."
                            : ""}
                      </span>
                    </>
                  ) : (
                    <>
                      <h3>Додай ім’я користувача</h3>
                      <p>Так друзям буде легше тебе знайти.</p>
                      <Link href="/profile">Перейти до профілю →</Link>
                    </>
                  )}
                </section>
                <Link
                  href="/friends/activity"
                  className="friends-discover-link"
                >
                  <span aria-hidden="true">↗</span>
                  <div>
                    <strong>Що дивляться друзі?</strong>
                    <p>Останні знахідки та спільні списки</p>
                  </div>
                </Link>
              </aside>
            </div>
          )}
        </div>
        <AuthModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
      </AppPageShell>
    </main>
  );
}

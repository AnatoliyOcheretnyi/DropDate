"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FriendActivityFeed,
  type FriendActivity,
} from "../components/FriendActivityFeed";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { AppPageShell } from "../../../widgets/AppPageShell";
import { fetchWithAuth, useAuth } from "../../../shared/state/auth";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { useFriends } from "../hooks/useFriends";

type SharedList = {
  ID: string;
  Name: string;
  Visibility: string;
  ItemCount: number;
  MemberCount: number;
  ShareToken: string;
};

export function FriendsActivityScreen() {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const { savedCount } = useSavedReleases();
  const { friends } = useFriends();
  const client = useQueryClient();
  const [tab, setTab] = useState<"activity" | "lists">("activity");
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState("friends");
  const [invite, setInvite] = useState("");

  const activity = useQuery({
    queryKey: ["friend-activity", user?.id],
    enabled: Boolean(user && accessToken),
    queryFn: async ({ signal }) => {
      const response = await fetchWithAuth(
        "/api/social/activity",
        { signal },
        user?.id,
      );
      if (!response.ok) throw new Error("Не вдалося завантажити активність");
      const payload = await response.json();
      return (payload.items ?? []) as FriendActivity[];
    },
    staleTime: 30_000,
    retry: 2,
  });
  const lists = useQuery({
    queryKey: ["shared-lists", user?.id],
    enabled: Boolean(user && accessToken),
    queryFn: async () => {
      const r = await fetch("/api/social/lists", {
        headers: { authorization: `Bearer ${accessToken}` },
      });
      const p = await r.json();
      if (!r.ok) throw new Error(p.message);
      return p.items as SharedList[];
    },
  });
  const create = useMutation({
    mutationFn: async () => {
      const r = await fetch("/api/social/lists", {
        method: "POST",
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ name, visibility }),
      });
      if (!r.ok) throw new Error("Не вдалося створити список");
    },
    onSuccess: () => {
      setName("");
      void client.invalidateQueries({ queryKey: ["shared-lists", user?.id] });
    },
  });
  const addMember = async (listId: string) => {
    if (!invite) return;
    await fetch("/api/social/lists/members", {
      method: "POST",
      headers: {
        authorization: `Bearer ${accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ listId, userId: invite, role: "editor" }),
    });
    setInvite("");
    void client.invalidateQueries({ queryKey: ["shared-lists", user?.id] });
  };

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
        <section className="friends-shell social-hub social-hub--visual">
          <Link href="/friends" className="friend-activity__back">
            ← Моє коло
          </Link>
          <div className="friends-hero">
            <div className="friends-hero__copy">
              <p className="eyebrow">ЗНАЙДЕНО ТВОЇМИ ЛЮДЬМИ</p>
              <h1>Що дивляться друзі</h1>
              <p>
                Їхні враження — твій наступний фільм. Збирай знахідки у власний
                список.
              </p>
            </div>
          </div>
          <div className="friend-seg">
            <button
              className={tab === "activity" ? "is-active" : ""}
              onClick={() => setTab("activity")}
            >
              Активність
            </button>
            <button
              className={tab === "lists" ? "is-active" : ""}
              onClick={() => setTab("lists")}
            >
              Спільні списки
            </button>
          </div>
          {!user ? (
            <div className="friends-empty">
              Увійди, щоб бачити активність друзів.
            </div>
          ) : tab === "activity" ? (
            <FriendActivityFeed
              items={activity.data ?? []}
              loading={activity.isLoading}
              refreshing={activity.isFetching}
              failed={activity.isError}
              retry={() => void activity.refetch()}
            />
          ) : (
            <>
              <form
                className="social-list-create"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (name.trim()) create.mutate();
                }}
              >
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Наприклад, Вечір п'ятниці"
                />
                <select
                  value={visibility}
                  onChange={(event) => setVisibility(event.target.value)}
                >
                  <option value="private">Приватний</option>
                  <option value="friends">Для друзів</option>
                  <option value="public">Публічний</option>
                </select>
                <button disabled={create.isPending}>Створити</button>
              </form>
              <div className="social-list-grid">
                {(lists.data ?? []).map((list) => (
                  <article key={list.ID}>
                    <p className="eyebrow">{list.Visibility}</p>
                    <h3>{list.Name}</h3>
                    <span>
                      {list.ItemCount} тайтлів · {list.MemberCount} учасників
                    </span>
                    {list.Visibility === "public" ? (
                      <a href={`/shared/${list.ShareToken}`}>
                        Публічне посилання
                      </a>
                    ) : null}
                    <div className="social-list-invite">
                      <select
                        value={invite}
                        onChange={(event) => setInvite(event.target.value)}
                      >
                        <option value="">Додати друга</option>
                        {friends.map((friend) => (
                          <option key={friend.user.id} value={friend.user.id}>
                            {friend.user.username || friend.user.email}
                          </option>
                        ))}
                      </select>
                      <button
                        disabled={!invite}
                        onClick={() => void addMember(list.ID)}
                      >
                        +
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </AppPageShell>
    </main>
  );
}

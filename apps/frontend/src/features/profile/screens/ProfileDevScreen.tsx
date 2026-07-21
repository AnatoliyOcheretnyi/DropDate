"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppPageShell } from "../../../widgets/AppPageShell";
import { useAuth } from "../../../shared/state/auth";
import { useProfile } from "../hooks/useProfile";

export function ProfileDevScreen() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    blurTimeoutRef,
    handleNav,
    handleSearchClose,
    handleSearchToggle,
    handleSubmit,
    handleSuggestionSelect,
    isSearchOpen,
    isSuggestionSaved,
    isFetchingSuggestions,
    savedCount,
    setTitle,
    suggestions,
    title,
    user,
  } = useProfile();

  useEffect(() => {
    if (!user) {
      return;
    }
    if (!user.isSuperuser) {
      router.replace("/profile");
    }
  }, [router, user]);

  const resetCache = async () => {
    setIsSubmitting(true);
    setStatus(null);
    try {
      const response = await fetch("/api/dev/cache/reset", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
        },
      });
      const payload = (await response.json().catch(() => null)) as
        | { message?: string; cleared?: string[] }
        | null;
      if (!response.ok) {
        throw new Error(payload?.message || "Не вдалося скинути кеш.");
      }
      setStatus(
        payload?.cleared?.length
          ? `Готово. Очищено: ${payload.cleared.join(", ")}.`
          : "Готово. Кеш очищено."
      );
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : "Не вдалося скинути кеш."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user?.isSuperuser) {
    return null;
  }

  return (
    <main className="page page--profile">
      <AppPageShell
        active="home"
        savedCount={savedCount}
        onChange={handleNav}
        isSearchOpen={isSearchOpen}
        onSearchToggle={handleSearchToggle}
        onSearchClose={handleSearchClose}
        searchOverlay={{
          title,
          isLoading: false,
          isOpen: isSearchOpen,
          onClose: handleSearchClose,
          onChange: setTitle,
          onSubmit: handleSubmit,
          onFocus: () => undefined,
          onBlur: () => {
            blurTimeoutRef.current = setTimeout(() => {}, 150);
          },
          suggestions,
          isFetchingSuggestions,
          onSuggestionSelect: handleSuggestionSelect,
          isSuggestionSaved,
        }}
      >
        <section className="profile-shell">
          <div className="profile-dev-page">
            <div className="profile-dev-page__head">
              <div>
                <p className="eyebrow">Dev Zone</p>
                <h1>Інструменти профілю</h1>
                <p>
                  Доступно лише для superuser. Тут можна примусово очистити
                  серверні кеші та перевалідувати домашню сторінку.
                </p>
              </div>
              <Link href="/profile" className="profile-people-manage">
                ← Назад у профіль
              </Link>
            </div>

            <div className="profile-dev-tool">
              <div>
                <h2>Скинути кеш зараз</h2>
                <p>
                  Очистить release/recommendation cache на бекенді і оновить
                  Next cache для головної та профілю.
                </p>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => void resetCache()}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Скидаю кеш..." : "Скинути кеш"}
              </button>
            </div>

            {status ? <p className="profile-dev-card__status">{status}</p> : null}
          </div>
        </section>
      </AppPageShell>
    </main>
  );
}

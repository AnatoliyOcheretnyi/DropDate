"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Header } from "../../../widgets/Header";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";

type Props = {
  children: ReactNode;
  /** Show the "← Всі ігри" back link (game screens; the hub omits it). */
  withBack?: boolean;
  /** Compact top padding while a round is on screen. */
  playing?: boolean;
};

/**
 * Common chrome for every games surface: app header, shell width and the
 * back-to-hub link.
 */
export function GameShell({ children, withBack = true, playing = false }: Props) {
  const router = useRouter();
  const { saved } = useSavedReleases();

  return (
    <main className="page page--games">
      <Header
        active="games"
        savedCount={saved.length}
        onChange={(view) => router.push(view === "saved" ? "/saved" : "/")}
        isSearchOpen={false}
        onSearchToggle={() => router.push("/")}
        onSearchClose={() => undefined}
      />
      <section className={`games-shell${playing ? " games-shell--playing" : ""}`}>
        {withBack ? (
          <button
            type="button"
            className="games-back"
            onClick={() => router.push("/games")}
          >
            ← Всі ігри
          </button>
        ) : null}
        {children}
      </section>
    </main>
  );
}

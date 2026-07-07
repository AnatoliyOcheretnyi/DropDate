"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { webQueryKeys } from "../../../shared/api/queryKeys";
import { useAuth } from "../../../shared/state/auth";
import { useSuggestions } from "../../../shared/hooks/useSuggestions";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import type {
  PersonCredit,
  PersonRole,
  Suggestion,
} from "../../../shared/lib/release";
import type { ListType } from "../../../shared/types/releases";
import { fetchPerson, fetchPersonPick } from "../api/personApi";
import { useFollowedPeople } from "../../people/hooks/useFollowedPeople";

export type CreditGroup = {
  role: "actor" | "director" | "writer";
  label: string;
  eyebrow: string;
  credits: PersonCredit[];
};

export type SavedCreditEntry = {
  credit: PersonCredit;
  listTypes: ListType[];
};

const ROLE_META: Record<
  CreditGroup["role"],
  { label: string; eyebrow: string; order: number }
> = {
  director: { label: "Як режисер", eyebrow: "Режисура", order: 0 },
  actor: { label: "Як актор", eyebrow: "Акторські роботи", order: 1 },
  writer: { label: "Як сценарист", eyebrow: "Сценарії", order: 2 },
};

const creditToSuggestion = (credit: PersonCredit): Suggestion => ({
  id: credit.tmdbId,
  title: credit.title,
  mediaType: credit.mediaType,
  year: credit.year,
  posterUrl: credit.posterUrl,
});

export function usePersonDetails() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, accessToken } = useAuth();

  const id = Number(params?.id || 0);
  const isValid = Boolean(id);

  const [title, setTitle] = useState("");
  const [, setIsInputFocused] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { savedCount, getListTypes, isSuggestionSaved } = useSavedReleases();
  const followed = useFollowedPeople();
  const isAuthed = Boolean(user && accessToken);

  const handleClearSelection = useCallback(() => {}, []);
  const { suggestions, isFetching: isFetchingSuggestions } = useSuggestions(
    title,
    null,
    handleClearSelection
  );

  const personQuery = useQuery({
    queryKey: webQueryKeys.person(id),
    enabled: isValid,
    queryFn: async ({ signal }) => {
      const person = await fetchPerson(id, signal);
      if (!person) {
        throw new Error("Не вдалося завантажити інформацію про персону");
      }
      return person;
    },
    staleTime: 1000 * 60 * 10,
  });

  const person = personQuery.data ?? null;

  // Which role the visitor arrived as — set by the card they tapped, otherwise
  // inferred from the person's primary profession.
  const activeRole: PersonRole = useMemo(() => {
    const raw = (searchParams?.get("role") || "").toLowerCase();
    if (raw === "actor" || raw === "director") {
      return raw;
    }
    return person?.knownForDepartment === "Directing" ? "director" : "actor";
  }, [person?.knownForDepartment, searchParams]);

  const creditGroups = useMemo<CreditGroup[]>(() => {
    const credits = person?.credits ?? [];
    const byRole = new Map<CreditGroup["role"], PersonCredit[]>();
    credits.forEach((credit) => {
      const list = byRole.get(credit.role) ?? [];
      list.push(credit);
      byRole.set(credit.role, list);
    });

    const groups: CreditGroup[] = [];
    (["director", "actor", "writer"] as const).forEach((role) => {
      const list = byRole.get(role);
      if (!list || list.length === 0) {
        return;
      }
      groups.push({
        role,
        label: ROLE_META[role].label,
        eyebrow: ROLE_META[role].eyebrow,
        credits: list,
      });
    });

    // The role the visitor came in as leads; the rest follow their natural order.
    return groups.sort((a, b) => {
      if (a.role === activeRole) return -1;
      if (b.role === activeRole) return 1;
      return ROLE_META[a.role].order - ROLE_META[b.role].order;
    });
  }, [activeRole, person?.credits]);

  // Titles from this person's filmography the user already has in a list.
  const savedCredits = useMemo<SavedCreditEntry[]>(() => {
    const credits = person?.credits ?? [];
    const seen = new Set<string>();
    const entries: SavedCreditEntry[] = [];
    credits.forEach((credit) => {
      const key = `${credit.mediaType}:${credit.tmdbId}`;
      if (seen.has(key)) {
        return;
      }
      const listTypes = getListTypes(creditToSuggestion(credit));
      if (listTypes.length > 0) {
        seen.add(key);
        entries.push({ credit, listTypes });
      }
    });
    return entries;
  }, [getListTypes, person?.credits]);

  const pickQuery = useQuery({
    queryKey: webQueryKeys.personPick(id, activeRole),
    enabled: isValid && Boolean(user && accessToken),
    queryFn: async ({ signal }) =>
      fetchPersonPick(id, activeRole, accessToken!, signal),
    staleTime: 1000 * 60 * 10,
  });

  const followState = person
    ? followed.getFollow(person.id, activeRole)
    : undefined;

  const followTarget = useMemo(
    () =>
      person
        ? {
            tmdbId: person.id,
            role: activeRole,
            name: person.name,
            profileUrl: person.profileUrl,
            knownFor: person.knownForDepartment,
          }
        : null,
    [activeRole, person]
  );

  const { toggleLike, toggleSubscribe } = followed;
  const handleToggleLike = useCallback(() => {
    if (followTarget) {
      toggleLike(followTarget);
    }
  }, [toggleLike, followTarget]);

  const handleToggleSubscribe = useCallback(() => {
    if (followTarget) {
      toggleSubscribe(followTarget);
    }
  }, [toggleSubscribe, followTarget]);

  const openTitle = useCallback(
    (credit: Pick<PersonCredit, "tmdbId" | "mediaType">) => {
      router.push(`/title/${credit.mediaType}/${credit.tmdbId}`);
    },
    [router]
  );

  // Search overlay + nav plumbing, mirroring the title details page.
  const handleSearchToggle = () => setIsSearchOpen((prev) => !prev);
  const handleSearchClose = useCallback(() => {
    setIsSearchOpen(false);
    setIsInputFocused(false);
  }, []);
  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    handleSearchClose();
    router.push(`/search?query=${encodeURIComponent(trimmed)}`);
  };
  const handleSuggestionSelect = useCallback(
    (suggestion: Suggestion) => {
      handleSearchClose();
      router.push(`/title/${suggestion.mediaType}/${suggestion.id}`);
    },
    [handleSearchClose, router]
  );
  const handleNav = (view: string) => {
    router.push(view === "saved" ? "/saved" : "/");
  };

  return {
    id,
    isValid,
    person,
    isLoading: personQuery.isLoading,
    error: !isValid
      ? "Некоректний запит"
      : personQuery.isError
      ? "Не вдалося завантажити інформацію про персону"
      : null,
    activeRole,
    creditGroups,
    savedCredits,
    pick: pickQuery.data ?? null,
    isAuthed,
    followState,
    onToggleLike: handleToggleLike,
    onToggleSubscribe: handleToggleSubscribe,
    openTitle,
    getListTypes,
    // search overlay / nav
    blurTimeoutRef,
    savedCount,
    title,
    setTitle,
    setIsInputFocused,
    isSearchOpen,
    suggestions,
    isFetchingSuggestions,
    isSuggestionSaved,
    handleSearchToggle,
    handleSearchClose,
    handleSearchSubmit,
    handleSuggestionSelect,
    handleNav,
  };
}

"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchPerson } from "../../personDetails/api/personApi";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import type { GameQuestion } from "../api/games";
import { GameFinds } from "./GameFinds";

export function PeopleReveal({ question }: { question: GameQuestion }) {
  const person = question.person ?? question.people?.find(item => item.tmdbId === question.answerId);
  const movie = question.card ?? question.options?.find(item => item.tmdbId === question.answerId);
  const director = question.mode === "movie_director" || question.mode === "director_movie";
  const { getListTypes } = useSavedReleases();
  const credits = useQuery({ queryKey: ["game-person", person?.tmdbId], enabled: Boolean(person), queryFn: ({ signal }) => fetchPerson(person!.tmdbId, signal), staleTime: 300_000 });
  if (!person || !movie) return null;
  const seen = new Set<number>();
  const more = [...(credits.data?.credits ?? [])]
    .filter(item => item.mediaType === "movie" && item.role === (director ? "director" : "actor") && item.tmdbId !== movie.tmdbId)
    .filter(item => {
      if (seen.has(item.tmdbId)) return false;
      seen.add(item.tmdbId);
      return !getListTypes({ ...item, id: item.tmdbId }).some(list => ["watched", "liked", "favorite", "disliked"].includes(list));
    })
    .sort((a, b) => (b.voteAverage ?? 0) - (a.voteAverage ?? 0)).slice(0, 3);
  return <section className="people-discovery">
    <p><Link href={`/person/${person.tmdbId}`}>{person.name}</Link>{director ? " — режисер фільму " : " грає у фільмі "}<Link href={`/title/${movie.mediaType}/${movie.tmdbId}`}>«{movie.title}»</Link>{!director && person.role ? ` · роль: ${person.role}` : ""}.</p>
    {credits.isLoading ? <p>Шукаємо інші роботи…</p> : more.length ? <GameFinds titles={more} heading="Ще роботи, які ти не переглядав" /> : <Link href={`/person/${person.tmdbId}`}>Переглянути фільмографію →</Link>}
  </section>;
}

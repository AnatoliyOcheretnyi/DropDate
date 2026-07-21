"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GameShell } from "../components/GameShell";
import { fetchGameQuestions, type GameMode, type GameQuestion } from "../api/games";

const MODES: Array<{ id: GameMode; label: string }> = [
  { id: "movie_actor", label: "Актор у фільмі" }, { id: "actor_movie", label: "Фільм актора" },
  { id: "movie_director", label: "Режисер фільму" }, { id: "director_movie", label: "Фільм режисера" },
];

export function PeopleGameScreen() {
  const router = useRouter(); const params = useSearchParams();
  const mode = MODES.some((item) => item.id === params.get("mode")) ? params.get("mode") as GameMode : null;
  const [questions, setQuestions] = useState<GameQuestion[]>([]); const [index, setIndex] = useState(0); const [selected, setSelected] = useState<number | null>(null); const [score, setScore] = useState(0); const [loading, setLoading] = useState(false);
  useEffect(() => { if (!mode) return; setLoading(true); void fetchGameQuestions(mode, 10).then((items) => { setQuestions(items); setIndex(0); setScore(0); setSelected(null); }).finally(() => setLoading(false)); }, [mode]);
  if (!mode) return <GameShell><section className="people-game-setup"><p className="eyebrow">Люди кіно</p><h1>Хто знімав і хто знімався?</h1><p>Тренуй зв’язки між акторами, режисерами та їхніми фільмами.</p><div>{MODES.map((item) => <button key={item.id} onClick={() => router.push(`/games/people?mode=${item.id}`)}>{item.label}<span>Грати →</span></button>)}</div></section></GameShell>;
  if (loading) return <GameShell><div className="games-loading">Готуємо кінозв’язки…</div></GameShell>;
  const question = questions[index]; const finished = !question;
  const answer = (id: number) => { if (selected !== null) return; setSelected(id); if (id === question.answerId) setScore((value) => value + 1); };
  const next = () => { setSelected(null); setIndex((value) => value + 1); };
  return <GameShell playing={!finished}>
    {finished ? <div className="games-summary"><h2>Раунд завершено</h2><div className="games-summary-stats"><div><strong>{score}/{questions.length}</strong><span>Правильних</span></div></div><div className="games-summary-actions"><button className="primary" onClick={() => router.push("/games/people")}>Інший режим</button><button onClick={() => router.push(`/games/people?mode=${mode}`)}>Ще раз</button></div></div> : <section className="people-game">
      <header><div><p className="eyebrow">Люди кіно · {index + 1}/{questions.length}</p><h1>{question.prompt}</h1></div><strong>{score} очок</strong></header>
      {question.card ? <div className="people-game__subject">{question.card.posterUrl ? <Image src={question.card.posterUrl} alt="" width={150} height={225} /> : null}<div><strong>{question.card.title}</strong><span>{question.card.year}</span></div></div> : null}
      {question.person ? <div className="people-game__subject is-person">{question.person.profileUrl ? <Image src={question.person.profileUrl} alt="" width={150} height={150} /> : <span className="people-game__avatar">{question.person.name.slice(0,1)}</span>}<div><strong>{question.person.name}</strong><span>{question.person.role}</span></div></div> : null}
      <div className="people-game__options">{question.people?.map((person) => <button key={person.tmdbId} className={selected === null ? "" : person.tmdbId === question.answerId ? "is-correct" : person.tmdbId === selected ? "is-wrong" : "is-muted"} onClick={() => answer(person.tmdbId)}>{person.profileUrl ? <Image src={person.profileUrl} alt="" width={72} height={72} /> : <span>{person.name.slice(0,1)}</span>}<strong>{person.name}</strong></button>)}{question.options?.map((movie) => <button key={movie.tmdbId} className={selected === null ? "" : movie.tmdbId === question.answerId ? "is-correct" : movie.tmdbId === selected ? "is-wrong" : "is-muted"} onClick={() => answer(movie.tmdbId)}>{movie.posterUrl ? <Image src={movie.posterUrl} alt="" width={72} height={105} /> : null}<strong>{movie.title}</strong></button>)}</div>
      {selected !== null ? <div className="people-game__reveal"><strong>{selected === question.answerId ? "Правильно!" : "Не цього разу"}</strong><button onClick={next}>{index + 1 >= questions.length ? "Результат" : "Далі →"}</button></div> : null}
    </section>}
  </GameShell>;
}

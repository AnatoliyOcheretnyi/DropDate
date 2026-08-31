"use client";

import { useRouter } from "next/navigation";
import { GameShell } from "../../games/components/GameShell";
import { GameHud } from "../../games/components/GameHud";
import { GameStage } from "../../games/components/GameStage";
import { useSavedReleases } from "../../saved/hooks/useSavedReleases";
import { AkinatorGuessCard } from "../components/AkinatorGuessCard";
import { AkinatorQuestionCard } from "../components/AkinatorQuestionCard";
import { useAkinatorSession } from "../hooks/useAkinatorSession";

const TOTAL_STEPS = 20;

export function AkinatorScreen() {
  const router = useRouter();
  const session = useAkinatorSession();
  const { addRelease } = useSavedReleases();
  const guess = session.current?.guess;
  const question = session.current?.question;

  const saveGuess = () => {
    if (!guess) {
      return;
    }
    addRelease(
      {
        title: guess.title,
        type: "movie",
        nextRelease: "",
        source: "tmdb",
        posterUrl: guess.posterUrl,
        backdropUrl: guess.backdropUrl,
        status: "released",
      },
      { tmdbId: guess.tmdbId, mediaType: "movie" },
      ["watchlist"]
    );
  };

  return (
    <GameShell playing={Boolean(session.current)}>
      {!session.current ? (
        <section className="akinator-intro">
          <span className="akinator-intro__mark">20?</span>
          <p className="eyebrow">Кіноакінатор</p>
          <h1>
            Задумай фільм.
            <br />Я спробую його вгадати.
          </h1>
          <p>Відповідай чесно, але не хвилюйся: одна неточність мене не зібʼє.</p>
          <button type="button" disabled={session.loading} onClick={session.start}>
            {session.loading ? "Готую питання…" : "Почати гру"}
          </button>
        </section>
      ) : null}

      {question && session.current ? (
        <GameStage roundKey={question.id} className="akinator-round">
          <GameHud
            kicker="Кіноакінатор"
            mode="timed"
            metrics={[
              { label: "Питання", value: `${session.current.step} / ${TOTAL_STEPS}` },
              { label: "Кандидатів", value: `${session.current.candidates}` },
            ]}
            timeRatio={1 - session.current.step / TOTAL_STEPS}
            timeLabel={`${session.current.step}`}
          />
          <AkinatorQuestionCard
            question={question}
            step={session.current.step}
            candidates={session.current.candidates}
            disabled={session.loading}
            onAnswer={session.answer}
          />
        </GameStage>
      ) : null}

      {guess ? (
        <GameStage roundKey={guess.tmdbId} className="akinator-round">
          <AkinatorGuessCard
            guess={guess}
            outcome={session.outcome}
            onCorrect={() => session.finish(true)}
            onWrong={() => session.finish(false)}
            onDetails={() => router.push(`/title/movie/${guess.tmdbId}`)}
            onSave={saveGuess}
            onRestart={session.start}
          />
        </GameStage>
      ) : null}

      {session.current?.type === "give_up" ? (
        <section className="akinator-intro">
          <p className="eyebrow">Ти переміг</p>
          <h1>Цей фільм мене перехитрив.</h1>
          <p>Спробуємо інший?</p>
          <button type="button" onClick={session.start}>
            Нова гра
          </button>
        </section>
      ) : null}

      {session.error ? <p className="games-error">{session.error}</p> : null}
    </GameShell>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthModal } from "../../../widgets/AuthModal";
import { CoverImage } from "../../../shared/ui/CoverImage";
import { StarRating } from "../../../shared/ui/StarRating";
import { useAuth } from "../../../shared/state/auth";
import type { SavedRelease } from "../../../shared/types/releases";
import { FriendAvatar } from "../../friends/components/FriendAvatar";
import { fetchFriendSaved } from "../../friends/api/friendsApi";
import { useFriends } from "../../friends/hooks/useFriends";
import { Confetti } from "../components/Confetti";
import { GameShell } from "../components/GameShell";
import { ShareResultButton } from "../components/ShareResultButton";
import { useGameStats } from "../hooks/useGameStats";

const ROUNDS = 10;
const MIN_RATING_GAP = 2;
const MAX_TITLE_USES = 2;

type Status = "pick" | "loading" | "playing" | "finished" | "empty" | "error";

type TastePair = {
  left: SavedRelease;
  right: SavedRelease;
  /** Side the friend rated higher. */
  answer: "left" | "right";
};

const shuffle = <T,>(items: T[]): T[] => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

// Greedily pair rated titles whose ratings differ enough to be a fair
// question, capping how often one title appears.
const buildPairs = (items: SavedRelease[]): TastePair[] => {
  const rated = shuffle(
    items.filter((item) => (item.userRating ?? 0) > 0 && item.tmdbId)
  );
  const uses = new Map<string, number>();
  const seenPairs = new Set<string>();
  const pairs: TastePair[] = [];

  for (const a of rated) {
    if (pairs.length >= ROUNDS) {
      break;
    }
    for (const b of rated) {
      if (pairs.length >= ROUNDS || a.id === b.id) {
        continue;
      }
      const gap = Math.abs((a.userRating ?? 0) - (b.userRating ?? 0));
      if (gap < MIN_RATING_GAP) {
        continue;
      }
      const pairId = [a.id, b.id].sort().join("|");
      if (seenPairs.has(pairId)) {
        continue;
      }
      if ((uses.get(a.id) ?? 0) >= MAX_TITLE_USES || (uses.get(b.id) ?? 0) >= MAX_TITLE_USES) {
        continue;
      }
      seenPairs.add(pairId);
      uses.set(a.id, (uses.get(a.id) ?? 0) + 1);
      uses.set(b.id, (uses.get(b.id) ?? 0) + 1);
      const [left, right] = Math.random() < 0.5 ? [a, b] : [b, a];
      pairs.push({
        left,
        right,
        answer: (left.userRating ?? 0) > (right.userRating ?? 0) ? "left" : "right",
      });
      break;
    }
  }
  return shuffle(pairs);
};

export function FriendTasteScreen() {
  const router = useRouter();
  const { user, accessToken } = useAuth();
  const isAuthed = Boolean(user && accessToken);
  const { friends, isLoading: friendsLoading } = useFriends();
  const { record } = useGameStats("friend_taste");
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const [status, setStatus] = useState<Status>("pick");
  const [friendName, setFriendName] = useState("");
  const [pairs, setPairs] = useState<TastePair[]>([]);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<"left" | "right" | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const recordedRef = useRef(false);

  const startWithFriend = useCallback(
    async (friendId: string, name: string) => {
      if (!accessToken) {
        return;
      }
      setStatus("loading");
      setFriendName(name);
      setIndex(0);
      setSelected(null);
      setResults([]);
      recordedRef.current = false;
      try {
        const items = await fetchFriendSaved(accessToken, friendId, undefined);
        const built = buildPairs(items);
        if (built.length < 3) {
          setStatus("empty");
          return;
        }
        setPairs(built);
        setStatus("playing");
      } catch {
        setStatus("error");
      }
    },
    [accessToken]
  );

  const pair = pairs[index] ?? null;
  const revealed = selected !== null;
  const score = results.filter(Boolean).length;

  const choose = (side: "left" | "right") => {
    if (!pair || revealed) {
      return;
    }
    setSelected(side);
    setResults((prev) => [...prev, side === pair.answer]);
  };

  const nextRound = () => {
    if (index + 1 >= pairs.length) {
      setStatus("finished");
      return;
    }
    setIndex((prev) => prev + 1);
    setSelected(null);
  };

  useEffect(() => {
    if (status === "finished" && !recordedRef.current) {
      recordedRef.current = true;
      record({ score });
    }
  }, [status, record, score]);

  const shareText = `DropDate · Смак друга (@${friendName})\nВгадав ${score}/${results.length} ${results
    .map((ok) => (ok ? "🟩" : "🟥"))
    .join("")}`;

  const renderCard = (side: "left" | "right") => {
    if (!pair) {
      return null;
    }
    const item = side === "left" ? pair.left : pair.right;
    const stateClass = !revealed
      ? ""
      : side === pair.answer
        ? " is-correct"
        : side === selected
          ? " is-wrong"
          : "";
    return (
      <button
        type="button"
        className={`taste-card${stateClass}`}
        disabled={revealed}
        onClick={() => choose(side)}
      >
        <span className="taste-card__poster">
          {item.posterUrl ? (
            <CoverImage src={item.posterUrl} alt={item.title} sizes="(max-width: 900px) 45vw, 280px" />
          ) : (
            <span className="taste-card__fallback">{item.title.slice(0, 1)}</span>
          )}
        </span>
        <span className="taste-card__title">{item.title}</span>
        {revealed ? (
          <span className="taste-card__rating">
            <StarRating value={item.userRating} readOnly />
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <GameShell playing={status === "playing"}>
      {status === "pick" && (
        <div className="taste-pick">
          <div className="games-head games-head--tight">
            <p className="eyebrow">Смак друга</p>
            <h1>Наскільки добре ти знаєш смак друзів?</h1>
            <p className="games-lead">
              Обери друга — і вгадуй, які фільми він чи вона оцінили вище.
            </p>
          </div>
          {!isAuthed ? (
            <div className="games-error">
              Потрібен акаунт, щоб грати з друзями.{" "}
              <button type="button" className="taste-link" onClick={() => setIsAuthOpen(true)}>
                Увійти
              </button>
            </div>
          ) : friendsLoading ? (
            <div className="games-loading">Завантажуємо друзів…</div>
          ) : friends.length === 0 ? (
            <div className="games-error">
              У тебе поки нема друзів у DropDate.{" "}
              <button type="button" className="taste-link" onClick={() => router.push("/friends")}>
                Додати друга →
              </button>
            </div>
          ) : (
            <div className="taste-friends">
              {friends.map((entry) => {
                const label = entry.user.username || entry.user.email;
                return (
                  <button
                    key={entry.user.id}
                    type="button"
                    className="taste-friend"
                    onClick={() => void startWithFriend(entry.user.id, label)}
                  >
                    <FriendAvatar label={label} />
                    <span>@{entry.user.username || "без юзернейму"}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {status === "loading" && (
        <div className="games-loading">
          <span className="games-loading__reel" aria-hidden="true" />
          Вивчаємо оцінки @{friendName}…
        </div>
      )}

      {status === "empty" && (
        <div className="games-error">
          У @{friendName} замало оцінених тайтлів для гри (потрібно хоча б кілька
          оцінок з помітною різницею).{" "}
          <button type="button" className="taste-link" onClick={() => setStatus("pick")}>
            Обрати іншого друга
          </button>
        </div>
      )}

      {status === "error" && (
        <div className="games-error">
          Не вдалося завантажити оцінки друга.{" "}
          <button type="button" className="taste-link" onClick={() => setStatus("pick")}>
            Спробувати ще
          </button>
        </div>
      )}

      {status === "playing" && pair && (
        <div className="games-round">
          <aside className="games-round__side">
            <p className="games-kicker">Смак друга</p>
            <p className="games-prompt">Що @{friendName} оцінює вище?</p>
            <div className="games-scorebar">
              <span>
                Раунд {index + 1} / {pairs.length}
              </span>
              <span>Вгадано: {score}</span>
            </div>
            <div className="games-progress" aria-hidden="true">
              <span
                style={{
                  width: `${((index + (revealed ? 1 : 0)) / Math.max(1, pairs.length)) * 100}%`,
                }}
              />
            </div>
          </aside>

          <div className="games-round__board">
            <div
              key={`${pair.left.id}-${pair.right.id}`}
              className={`games-board games-board--enter${
                revealed && selected !== pair.answer ? " games-board--missed" : ""
              }`}
            >
              {renderCard("left")}
              <div className="games-vs" aria-hidden="true">
                VS
              </div>
              {renderCard("right")}
            </div>
          </div>

          {revealed && (
            <div
              className={`game-reveal game-reveal--${selected === pair.answer ? "correct" : "wrong"}`}
            >
              <span className="game-reveal__result">
                {selected === pair.answer ? "Знаєш друга!" : "А от і ні"}
              </span>
              <button type="button" className="primary game-reveal__next" onClick={nextRound}>
                {index + 1 >= pairs.length ? "Підсумок" : "Далі"}
              </button>
            </div>
          )}
        </div>
      )}

      {status === "finished" && (
        <div className="games-summary">
          {results.length > 0 && score / results.length >= 0.7 ? <Confetti /> : null}
          <h2>
            {score >= results.length * 0.8
              ? `Ти читаєш @${friendName} як відкриту книгу 👀`
              : "Гру завершено"}
          </h2>
          <div className="games-summary-stats">
            <div>
              <strong>
                {score} / {results.length}
              </strong>
              <span>Вгадано</span>
            </div>
          </div>
          <div className="games-summary-actions">
            <button type="button" className="primary" onClick={() => setStatus("pick")}>
              Інший друг
            </button>
            <ShareResultButton text={shareText} />
            <button type="button" onClick={() => router.push("/games")}>
              До ігор
            </button>
          </div>
        </div>
      )}

      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
    </GameShell>
  );
}

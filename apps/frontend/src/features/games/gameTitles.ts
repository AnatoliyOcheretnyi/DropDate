import type { GameQuestion, GameTitleCard } from "./api/games";

export function gameTitles(questions: GameQuestion[]): GameTitleCard[] {
  return questions.flatMap(q => [q.left, q.right, q.card, ...(q.items ?? []), ...(q.options ?? [])].filter((item): item is GameTitleCard => Boolean(item)));
}

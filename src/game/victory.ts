import { QuickState } from "./quickGame";
type ResultState = Pick<
  QuickState,
  "seed" | "player" | "difficulty" | "turn" | "result"
>;
export function victoryMovieKey(game: ResultState): string | null {
  return game.result === "win"
    ? JSON.stringify([game.seed, game.player, game.difficulty, game.turn])
    : null;
}
export function shouldShowVictory(
  game: ResultState,
  resultOpen: boolean,
  busy: boolean,
  shareOpen: boolean,
  seen: string | null,
): boolean {
  const key = victoryMovieKey(game);
  return key !== null && resultOpen && !busy && !shareOpen && seen !== key;
}

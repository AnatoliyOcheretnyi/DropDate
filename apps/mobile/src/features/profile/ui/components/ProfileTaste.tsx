import { useShallow } from "zustand/react/shallow";

import { useTasteStore } from "../../store/tasteStore";
import { TasteRanker } from "./TasteRanker";

/**
 * Each ranker subscribes to its own list, so reordering genres no longer
 * re-renders the countries list — and neither of them re-renders the menu,
 * the stats or the profile card above.
 */
export function ProfileTaste() {
  return (
    <>
      <GenreRanker />
      <CountryRanker />
    </>
  );
}

function GenreRanker() {
  const { items, move, reset } = useTasteStore(
    useShallow((state) => ({
      items: state.genres,
      move: state.move,
      reset: state.reset,
    })),
  );
  return (
    <TasteRanker
      title="Жанри"
      kind="genre"
      items={items}
      onMove={move}
      onReset={reset}
    />
  );
}

function CountryRanker() {
  const { items, move, reset } = useTasteStore(
    useShallow((state) => ({
      items: state.countries,
      move: state.move,
      reset: state.reset,
    })),
  );
  return (
    <TasteRanker
      title="Країни"
      kind="country"
      items={items}
      onMove={move}
      onReset={reset}
    />
  );
}

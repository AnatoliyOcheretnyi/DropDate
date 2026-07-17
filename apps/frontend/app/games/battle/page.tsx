"use client";

import { Suspense } from "react";
import { BattleScreen } from "../../../src/features/games/screens/BattleScreen";

export default function GamesBattlePage() {
  return (
    <Suspense fallback={null}>
      <BattleScreen />
    </Suspense>
  );
}

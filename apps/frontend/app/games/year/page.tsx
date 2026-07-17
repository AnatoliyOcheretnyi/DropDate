"use client";

import { Suspense } from "react";
import { YearScreen } from "../../../src/features/games/screens/YearScreen";

export default function GamesYearPage() {
  return (
    <Suspense fallback={null}>
      <YearScreen />
    </Suspense>
  );
}

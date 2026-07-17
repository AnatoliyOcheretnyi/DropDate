"use client";

import { Suspense } from "react";
import { BlitzScreen } from "../../../src/features/games/screens/BlitzScreen";

export default function GamesBlitzPage() {
  return (
    <Suspense fallback={null}>
      <BlitzScreen />
    </Suspense>
  );
}

"use client";

import {Suspense} from "react";
import { MoodScreen } from "../../src/features/mood/screens/MoodScreen";

export default function MoodPage() {
  return <Suspense fallback={<main className="world-loading">Готуємо підбір…</main>}><MoodScreen /></Suspense>;
}

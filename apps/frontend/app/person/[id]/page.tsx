"use client";

import { Suspense } from "react";
import { PersonScreen } from "../../../src/features/personDetails/screens/PersonScreen";

export default function PersonPage() {
  return (
    <Suspense fallback={null}>
      <PersonScreen />
    </Suspense>
  );
}

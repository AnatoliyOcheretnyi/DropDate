import { Suspense } from "react";
import { WorldScreen } from "../../src/features/world/WorldScreen";
export const metadata = {
  title: "Світ кіно",
  description:
    "Обертай глобус, досліджуй кінематограф країн та знаходь фільми для себе.",
};
export default function WorldPage() {
  return (
    <Suspense
      fallback={<main className="world-loading">Відкриваємо світ кіно…</main>}
    >
      <WorldScreen />
    </Suspense>
  );
}

"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled frontend error", error);
  }, [error]);

  return (
    <main className="page route-state" role="alert">
      <p className="eyebrow">Щось пішло не так</p>
      <h1>Не вдалося відкрити цю сторінку</h1>
      <p>Спробуй ще раз. Якщо проблема повториться, повернись на головну.</p>
      <button type="button" className="primary" onClick={reset}>
        Спробувати ще раз
      </button>
    </main>
  );
}

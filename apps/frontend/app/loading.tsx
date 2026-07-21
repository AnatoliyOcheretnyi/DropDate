export default function Loading() {
  return (
    <main className="page route-state" aria-busy="true" aria-live="polite">
      <div className="route-state__spinner" aria-hidden="true" />
      <p>Готуємо сторінку…</p>
    </main>
  );
}

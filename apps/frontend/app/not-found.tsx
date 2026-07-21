import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page route-state">
      <p className="eyebrow">404</p>
      <h1>Такої сторінки немає</h1>
      <p>Можливо, посилання застаріло або сторінку було переміщено.</p>
      <Link href="/" className="primary">
        На головну
      </Link>
    </main>
  );
}

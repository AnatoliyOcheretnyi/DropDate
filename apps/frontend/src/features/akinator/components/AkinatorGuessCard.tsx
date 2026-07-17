import Image from "next/image";
import type { AkinatorGuess } from "../api/akinator";

export function AkinatorGuessCard({ guess, outcome, onCorrect, onWrong, onDetails, onSave, onRestart }: { guess: AkinatorGuess; outcome: "correct" | "wrong" | null; onCorrect: () => void; onWrong: () => void; onDetails: () => void; onSave: () => void; onRestart: () => void }) {
  return <section className="akinator-guess">
    <p className="eyebrow">Моя відповідь</p><h1>Це «{guess.title}»?</h1>
    <div className="akinator-guess__poster">{guess.posterUrl ? <Image src={guess.posterUrl} alt={guess.title} fill sizes="240px" /> : <span>🎬</span>}</div>
    <p>{guess.year || ""} · впевненість {Math.round(guess.confidence * 100)}%</p>
    {!outcome ? <div className="akinator-guess__verdict"><button type="button" onClick={onCorrect}>Так, вгадав!</button><button type="button" onClick={onWrong}>Ні, не він</button></div> : null}
    {outcome === "correct" ? <div className="akinator-outcome"><strong>Я знав.</strong><span>Ще один фільм розгадано.</span><div><button type="button" onClick={onDetails}>Деталі</button><button type="button" onClick={onSave}>Зберегти</button><button type="button" onClick={onRestart}>Ще раз</button></div></div> : null}
    {outcome === "wrong" ? <div className="akinator-outcome akinator-outcome--wrong"><strong>Цього разу ти переміг.</strong><span>Я збережу результат для майбутнього покращення.</span><button type="button" onClick={onRestart}>Нова гра</button></div> : null}
  </section>;
}

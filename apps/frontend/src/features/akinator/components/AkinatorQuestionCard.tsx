import type { AkinatorAnswer, AkinatorQuestion } from "../api/akinator";

const ANSWERS: Array<{ value: AkinatorAnswer; label: string }> = [
  { value: "yes", label: "Так" }, { value: "probably", label: "Скоріше так" },
  { value: "unknown", label: "Не знаю" }, { value: "probably_not", label: "Скоріше ні" }, { value: "no", label: "Ні" },
];

export function AkinatorQuestionCard({ question, step, candidates, disabled, onAnswer }: { question: AkinatorQuestion; step: number; candidates: number; disabled: boolean; onAnswer: (answer: AkinatorAnswer) => void }) {
  return <section className="akinator-question">
    <div className="akinator-progress"><span>Питання {step} з 20</span><span>{candidates} кандидатів</span></div>
    <div className="akinator-orb" aria-hidden="true"><span>?</span></div>
    <h1>{question.text}</h1>
    <div className="akinator-answers">{ANSWERS.map((item) => <button key={item.value} type="button" disabled={disabled} data-answer={item.value} onClick={() => onAnswer(item.value)}>{item.label}</button>)}</div>
  </section>;
}

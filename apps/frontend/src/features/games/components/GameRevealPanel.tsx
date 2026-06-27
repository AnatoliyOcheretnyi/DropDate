"use client";

type Props = {
  isCorrect: boolean;
  isLast: boolean;
  onNext: () => void;
};

export function GameRevealPanel({ isCorrect, isLast, onNext }: Props) {
  return (
    <div className={`game-reveal game-reveal--${isCorrect ? "correct" : "wrong"}`}>
      <span className="game-reveal__result">
        {isCorrect ? "Правильно!" : "Не вгадав"}
      </span>
      <button type="button" className="primary game-reveal__next" onClick={onNext}>
        {isLast ? "Підсумок" : "Далі"}
      </button>
    </div>
  );
}

"use client";

import type { MoodQuestion } from "../api/mood";

type Props = {
  question: MoodQuestion;
  stepIndex: number;
  total: number;
  selected?: string;
  onAnswer: (optionId: string) => void;
  onBack: () => void;
};

export function MoodQuestionCard({
  question,
  stepIndex,
  total,
  selected,
  onAnswer,
  onBack,
}: Props) {
  return (
    <div className="mood-question">
      <div className="mood-progress" aria-hidden="true">
        {Array.from({ length: total }).map((_, index) => (
          <span
            key={index}
            className={`mood-progress-dot${index <= stepIndex ? " active" : ""}`}
          />
        ))}
      </div>
      <p className="mood-step-label">
        Питання {stepIndex + 1} / {total}
      </p>
      <h2 className="mood-question-title">{question.title}</h2>

      <div className="mood-options">
        {question.options.map((option) => (
          <button
            key={option.id}
            type="button"
            className={`mood-option${selected === option.id ? " selected" : ""}`}
            onClick={() => onAnswer(option.id)}
          >
            {option.emoji ? (
              <span className="mood-option-emoji" aria-hidden="true">
                {option.emoji}
              </span>
            ) : null}
            <span>{option.label}</span>
          </button>
        ))}
      </div>

      {stepIndex > 0 ? (
        <button type="button" className="mood-back" onClick={onBack}>
          ← Назад
        </button>
      ) : null}
    </div>
  );
}

"use client";

type Props = {
  value: number;
  onChange: (delta: number) => void;
};

export function WatchStepper({ value, onChange }: Props) {
  const count = value || 1;
  return (
    <div className="watch-stepper">
      <button
        type="button"
        className="watch-stepper__btn"
        onClick={() => onChange(-1)}
        disabled={count <= 1}
        aria-label="Зменшити"
      >
        −
      </button>
      <span className="watch-stepper__value" key={count} aria-live="polite">
        {count}
      </span>
      <button
        type="button"
        className="watch-stepper__btn"
        onClick={() => onChange(1)}
        aria-label="Збільшити"
      >
        +
      </button>
    </div>
  );
}

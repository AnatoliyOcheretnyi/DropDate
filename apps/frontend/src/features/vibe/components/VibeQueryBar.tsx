"use client";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  placeholder?: string;
  submitLabel?: string;
  size?: "md" | "lg";
};

const sparkles = (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 2.5 13.7 8l5.5 1.7-5.5 1.7L12 17l-1.7-5.6L4.8 9.7 10.3 8 12 2.5Zm7 11 .9 2.8 2.8.9-2.8.9-.9 2.8-.9-2.8-2.8-.9 2.8-.9.9-2.8ZM5 14l.7 2.1 2.1.7-2.1.7L5 19.6l-.7-2.1-2.1-.7 2.1-.7L5 14Z"
      fill="currentColor"
    />
  </svg>
);

/** The single input of the associative engine: a phrase, not a title. */
export function VibeQueryBar({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  placeholder = "молодіжний жах, де багато крові…",
  submitLabel = "Знайти",
  size = "md",
}: Props) {
  return (
    <form
      className={`vibe-bar vibe-bar--${size}`}
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      role="search"
    >
      <span className="vibe-bar__icon" aria-hidden="true">
        {sparkles}
      </span>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        aria-label="Опиши, що хочеш подивитись"
        onChange={(event) => onChange(event.target.value)}
      />
      <button type="submit" disabled={isLoading || value.trim().length < 3}>
        {isLoading ? "Шукаємо…" : submitLabel}
      </button>
    </form>
  );
}

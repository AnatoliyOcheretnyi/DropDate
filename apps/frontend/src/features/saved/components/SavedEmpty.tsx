"use client";

type EmptyKind = "library" | "list" | "filters";

type Props = {
  kind: EmptyKind;
  /** Label of the active list, used by the "list is empty" copy. */
  listLabel?: string;
  filterSummary?: string;
  onAction: () => void;
};

const ICONS: Record<EmptyKind, JSX.Element> = {
  library: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 3h12a2 2 0 0 1 2 2v16l-8-4-8 4V5a2 2 0 0 1 2-2Z"
        fill="currentColor"
      />
      <path d="M12 7v6m-3-3h6" stroke="#08121c" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  list: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h11v2H4V6Zm0 5h11v2H4v-2Zm0 5h8v2H4v-2Z" fill="currentColor" />
      <path
        d="m17 11 5 5m0-5-5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
  filters: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 4h13l-5 6v7l-3 2v-9L3 4Z" fill="currentColor" />
      <path
        d="m17 5 5 5m0-5-5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),
};

/**
 * Three states, not one. The middle one matters most: it is also how the user
 * discovers that the "Усі" tab exists.
 */
export function SavedEmpty({ kind, listLabel, filterSummary, onAction }: Props) {
  const content = {
    library: {
      title: "Тут поки порожньо",
      description:
        "Збережи перший фільм чи серіал — і ми стежитимемо за датами релізів замість тебе.",
      action: "Знайти тайтли",
    },
    list: {
      title: `У списку «${listLabel ?? ""}» поки нічого`,
      description:
        "Списки збираються з картки тайтла. А поки — глянь усю бібліотеку одним екраном.",
      action: "Показати всі тайтли",
    },
    filters: {
      title: "Нічого не знайшлось",
      description: filterSummary
        ? `Фільтри ${filterSummary} не дали результатів у цьому списку.`
        : "Спробуй прибрати частину фільтрів.",
      action: "Скинути фільтри",
    },
  }[kind];

  return (
    <div className={`saved-empty saved-empty--${kind}`}>
      <span className="saved-empty-icon" aria-hidden="true">
        {ICONS[kind]}
      </span>
      <h2>{content.title}</h2>
      <p>{content.description}</p>
      <button
        type="button"
        className={kind === "filters" ? "is-ghost" : ""}
        onClick={onAction}
      >
        {content.action}
      </button>
    </div>
  );
}

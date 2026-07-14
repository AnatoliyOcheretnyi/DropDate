"use client";

import { useEffect, useRef, useState } from "react";
import { FriendAvatar } from "./FriendAvatar";
import type { RelationshipStatus } from "../../../shared/types/friends";
import type { FriendSearchResult } from "../api/friendsApi";

type Props = {
  query: string;
  onQueryChange: (value: string) => void;
  results: FriendSearchResult[];
  isSearching: boolean;
  hasSearched: boolean;
  minQueryLength: number;
  onSendRequest: (query: string) => Promise<unknown>;
};

const STATUS_LABEL: Record<RelationshipStatus, string> = {
  none: "Додати",
  pending_outgoing: "Надіслано",
  pending_incoming: "Прийняти запит",
  accepted: "Уже друзі",
};

function ResultRow({
  result,
  onSendRequest,
}: {
  result: FriendSearchResult;
  onSendRequest: (query: string) => Promise<unknown>;
}) {
  const [sent, setSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = sent ? "pending_outgoing" : result.status;
  const canSend = status === "none";

  const handleSend = async () => {
    setError(null);
    setIsSending(true);
    try {
      await onSendRequest(result.user.username || result.user.email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося надіслати запит");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="friend-result-row" role="option" aria-selected={false}>
      <FriendAvatar label={result.user.username || result.user.email} size="sm" />
      <div className="friend-result-row__meta">
        <strong>@{result.user.username || "без юзернейму"}</strong>
        <span>{error ?? result.user.email}</span>
      </div>
      <button
        type="button"
        className={`btn-pill${canSend ? " btn-pill--accent" : " btn-pill--muted"}`}
        onClick={handleSend}
        disabled={!canSend || isSending}
      >
        {STATUS_LABEL[status]}
      </button>
    </div>
  );
}

export function FriendSearchBar({
  query,
  onQueryChange,
  results,
  isSearching,
  hasSearched,
  minQueryLength,
  onSendRequest,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const trimmed = query.trim();
  const hasPanelContent = trimmed.length > 0;

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      if (shellRef.current && event.target instanceof Node && shellRef.current.contains(event.target)) {
        return;
      }
      setIsOpen(false);
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  return (
    <div className="friend-search" ref={shellRef}>
      <div className={`friend-search__field${isOpen && hasPanelContent ? " is-open" : ""}`}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm0-2a9 9 0 1 0 5.66 15.99l4.68 4.68 1.41-1.41-4.68-4.68A9 9 0 0 0 11 2Z"
            fill="currentColor"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(event) => {
            onQueryChange(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Знайти людей: юзернейм або email"
          role="combobox"
          aria-controls="friend-search-panel"
          aria-expanded={isOpen && hasPanelContent}
          aria-label="Пошук друзів"
        />
        {isSearching ? <span className="friend-search__spinner" aria-hidden="true" /> : null}
        {trimmed.length > 0 ? (
          <button
            type="button"
            className="friend-search__clear"
            aria-label="Очистити пошук"
            onClick={() => {
              onQueryChange("");
              setIsOpen(false);
            }}
          >
            ✕
          </button>
        ) : null}
      </div>

      {isOpen && hasPanelContent ? (
        <div className="friend-search__panel" role="listbox" id="friend-search-panel">
          {trimmed.length < minQueryLength ? (
            <p className="friend-search__hint">
              Введи ще {minQueryLength - trimmed.length} симв. — шукаємо від {minQueryLength}
            </p>
          ) : isSearching && results.length === 0 ? (
            <div className="friend-search__skeletons" aria-hidden="true">
              <span />
              <span />
            </div>
          ) : results.length === 0 && hasSearched ? (
            <p className="friend-search__hint">Нікого не знайдено за «{trimmed}»</p>
          ) : (
            results.map((result, index) => (
              <div
                key={result.user.id}
                className="friend-stagger-in"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <ResultRow result={result} onSendRequest={onSendRequest} />
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

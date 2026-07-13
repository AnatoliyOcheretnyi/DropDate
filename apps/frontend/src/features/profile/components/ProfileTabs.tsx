"use client";

import type { TabDefinition, TabKey } from "../types";

type Props = {
  tabs: TabDefinition[];
  activeTab: TabKey;
  isAuthenticated: boolean;
  onChange: (tab: TabKey) => void;
};

export function ProfileTabs({ tabs, activeTab, isAuthenticated, onChange }: Props) {
  return (
    <div className="profile-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          data-list={tab.key}
          className={`profile-tab${activeTab === tab.key ? " active" : ""}`}
          aria-label={tab.label}
          onClick={() => onChange(tab.key)}
          disabled={!isAuthenticated && tab.key !== "follow"}
        >
          <span className={`tab-icon tab-icon--${tab.key}`} aria-hidden="true">
            {tab.key === "follow" && (
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 3a6 6 0 0 1 6 6v3.1l1.6 2.7a1 1 0 0 1-.86 1.5H5.26a1 1 0 0 1-.86-1.5l1.6-2.7V9a6 6 0 0 1 6-6Zm0 18a2.5 2.5 0 0 1-2.45-2h4.9A2.5 2.5 0 0 1 12 21Z"
                  fill="currentColor"
                />
              </svg>
            )}
            {tab.key === "watchlist" && (
              <svg viewBox="0 0 24 24">
                <path
                  d="M6 3h12a2 2 0 0 1 2 2v16l-8-4-8 4V5a2 2 0 0 1 2-2Z"
                  fill="currentColor"
                />
              </svg>
            )}
            {tab.key === "favorite" && (
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 20.6 4.6 13.3a4.5 4.5 0 0 1 6.4-6.4L12 7.9l1-1a4.5 4.5 0 1 1 6.4 6.4L12 20.6Z"
                  fill="currentColor"
                />
              </svg>
            )}
            {tab.key === "liked" && (
              <svg viewBox="0 0 24 24">
                <path
                  d="M21 10h-4V6.5C17 4.6 15.7 4 14.8 4c-.5 0-.9.3-1 .8l-1.2 5.2c-.1.5-.5 1-1 1.3L9 12v8h8.3c.8 0 1.5-.5 1.8-1.2l2.1-5.3c.5-1.3-.5-2.5-1.9-2.5H21Zm-18 2h3v8H3v-8Z"
                  fill="currentColor"
                />
              </svg>
            )}
            {tab.key === "watched" && (
              <svg viewBox="0 0 24 24">
                <path
                  d="M12 22a10 10 0 1 1 0-20 10 10 0 0 1 0 20Zm4.2-12.6-5.2 5.2-2.4-2.4-1.4 1.4 3.8 3.8 6.6-6.6-1.4-1.4Z"
                  fill="currentColor"
                />
              </svg>
            )}
            {tab.key === "disliked" && (
              <svg viewBox="0 0 24 24">
                <g transform="scale(1,-1) translate(0,-24)">
                  <path
                    d="M21 10h-4V6.5C17 4.6 15.7 4 14.8 4c-.5 0-.9.3-1 .8l-1.2 5.2c-.1.5-.5 1-1 1.3L9 12v8h8.3c.8 0 1.5-.5 1.8-1.2l2.1-5.3c.5-1.3-.5-2.5-1.9-2.5H21Zm-18 2h3v8H3v-8Z"
                    fill="currentColor"
                  />
                </g>
              </svg>
            )}
          </span>
          <span className="tab-label">{tab.label}</span>
          {typeof tab.count === "number" ? (
            <span className="tab-count">{tab.count}</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

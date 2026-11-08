export type AnalyticsEvent =
  | "page_view"
  | "world_country_selected"
  | "recommendations_shown"
  | "recommendation_opened"
  | "recommendation_feedback"
  | "title_watched"
  | "taste_onboarding_started"
  | "taste_onboarding_completed"
  | "daily_pick_revealed"
  | "daily_pick_saved"
  | "daily_pick_disliked"
  | "title_saved";

export type AnalyticsProperties = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

export function track(event: AnalyticsEvent, properties: AnalyticsProperties = {}) {
  if (typeof window === "undefined") return;

  const detail = { event, ...properties };
  window.dataLayer?.push(detail);
  window.dispatchEvent(new CustomEvent("dropdate:analytics", { detail }));
}

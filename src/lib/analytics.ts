/**
 * Provider-agnostic analytics event abstraction. When
 * NEXT_PUBLIC_ANALYTICS_KEY is unset, events are no-ops (dev logging only).
 * Wire a real provider (PostHog, Plausible, GA4, etc.) inside `dispatch`
 * without touching call sites.
 */
export type AnalyticsEvent =
  | "viewed_offering"
  | "clicked_book"
  | "started_booking"
  | "selected_date"
  | "started_checkout"
  | "completed_payment"
  | "booking_confirmed";

const isEnabled = typeof window !== "undefined" && Boolean(process.env.NEXT_PUBLIC_ANALYTICS_KEY);

export function track(event: AnalyticsEvent, properties?: Record<string, string | number | boolean>) {
  if (!isEnabled) {
    if (process.env.NODE_ENV === "development") {
      console.debug("[analytics:dev]", event, properties ?? {});
    }
    return;
  }
  dispatch(event, properties);
}

function dispatch(event: AnalyticsEvent, properties?: Record<string, string | number | boolean>) {
  // Intentionally left as a single integration point for a real provider.
  void event;
  void properties;
}

"use client";

import posthog from "posthog-js";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    clarity?: (...args: unknown[]) => void;
  }
}

export type EventName =
  | "optimize_page_viewed"
  | "cv_added"
  | "job_context_added"
  | "analyze_clicked"
  | "analysis_mode_changed"
  | "auth_modal_shown"
  | "auth_modal_dismissed"
  | "auth_completed"
  | "optimize_started"
  | "optimize_succeeded"
  | "optimize_failed"
  | "credit_check_failed"
  | "out_of_credits_modal_shown"
  | "out_of_credits_modal_dismissed"
  | "welcome_flash_shown"
  // Engagement flash sale (5-min, 80%-off Pro, armed after a few builder actions)
  | "flash_sale_armed"
  | "flash_sale_shown"
  | "flash_sale_dismissed"
  | "template_unlock_modal_shown"
  | "template_unlocked"
  | "results_viewed"
  | "score_upsell_clicked"
  | "landing_cta_clicked"
  | "pricing_clicked"
  | "checkout_started"
  | "purchase_completed"
  | "builder_welcome_viewed"
  | "builder_welcome_dismissed"
  | "scroll_depth"
  // Career-hub redesign events (Stage 8)
  | "landing_roles_submitted"
  | "start_choice"
  | "improvement_blurred_view"
  | "improvement_unlock_clicked"
  | "improvements_unlocked"
  | "multirole_generation_started"
  | "multirole_card_unlocked"
  | "voice_entry_clicked"
  | "voice_session_started"
  | "voice_session_completed"
  | "voice_finalized"
  | "voice_abandoned"
  | "voice_tool_applied"
  | "voice_error"
  // Chat-first builder
  | "chat_builder_opened"
  | "chat_message_sent"
  | "chat_tool_applied"
  | "chat_builder_finished"
  | "chat_builder_reset"
  | "chat_new_chat"
  | "chat_opened_history"
  | "chat_dictation_toggled"
  | "chat_cv_uploaded"
  | "chat_quick_edit_clicked"
  | "chat_builder_mode_switched"
  | "chat_error"
  // Unified Enhancv-style studio builder
  | "studio_toolbar_action"
  // Chat-first home (public landing chat)
  | "home_chat_opened"
  | "home_chat_message_sent"
  | "home_chat_tool_applied"
  | "home_chat_cv_uploaded"
  | "home_chat_finished"
  | "home_chat_error"
  | "home_cta_click"
  | "home_generate_full_draft"
  // Chat-first optimizer
  | "optimizer_chat_opened"
  | "optimizer_chat_uploaded"
  | "optimizer_chat_analyze"
  | "optimizer_chat_scored"
  | "optimizer_chat_view_full"
  // Build onboarding (beautiful guided front door)
  | "build_onboarding_viewed"
  | "build_onboarding_step"
  | "build_onboarding_completed"
  | "build_onboarding_path"
  | "build_onboarding_score_click"
  | "xp_awarded"
  | "level_up";

type EventProps = Record<string, string | number | boolean | null | undefined>;

// Low-cardinality dimensions worth slicing Clarity sessions by. Every key here
// becomes a Filter/Segment in the Clarity dashboard, so keep the list small and
// categorical — NEVER add ids, raw scores, counts, durations, file sizes or free
// text (use the bucketed form, e.g. `score_band` instead of `match_score`).
// Extend this set as new categorical props get added to `track()`.
const CLARITY_TAG_KEYS = new Set<string>([
  "source",
  "cta",
  "choice",
  "mode",
  "plan",
  "tier",
  "stage",
  "step",
  "tool",
  "type",
  "reason",
  "trigger",
  "variant",
  "category",
  "score_band",
  "signed_in",
  "signedIn",
  "quick",
  "template_id",
  "target_role",
]);

export function track(event: EventName, props: EventProps = {}) {
  if (typeof window === "undefined") return;

  // PostHog
  try {
    posthog.capture(event, props);
  } catch {
    // posthog may not be initialized yet — ignore
  }

  // Google Analytics / gtag
  try {
    window.gtag?.("event", event, props);
  } catch {
    // ignore
  }

  // Microsoft Clarity: fire the custom event (it shows on the session-replay
  // timeline AND becomes a filterable "Smart event"), then set ONLY the curated
  // low-cardinality tags. Tagging every prop floods Clarity's Filters/Segments
  // dropdowns with high-cardinality junk (ids, scores, counts) and makes
  // segmentation unusable.
  try {
    window.clarity?.("event", event);
    for (const [k, v] of Object.entries(props)) {
      if (!CLARITY_TAG_KEYS.has(k)) continue;
      if (v === undefined || v === null) continue;
      const s = String(v);
      if (s.length > 0 && s.length <= 40) {
        window.clarity?.("set", k, s);
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Bridge Clarity <-> PostHog. Stamps PostHog's session + distinct id as Clarity
 * custom tags so you can pivot from a PostHog event/funnel straight to the exact
 * Clarity replay (filter Clarity by `ph_session_id`). These are intentionally
 * high-cardinality lookup tags — search them by exact value, don't browse them.
 * Safe to call repeatedly (ids are stable within a session); call client-side
 * once both SDKs are ready.
 */
export function bridgeClarityToPostHog() {
  if (typeof window === "undefined") return;
  try {
    const ph = posthog as unknown as {
      get_session_id?: () => string | undefined;
      get_distinct_id?: () => string | undefined;
    };
    const sid = ph.get_session_id?.();
    const did = ph.get_distinct_id?.();
    if (sid) window.clarity?.("set", "ph_session_id", String(sid));
    if (did) window.clarity?.("set", "ph_distinct_id", String(did));
  } catch {
    // posthog/clarity may not be ready yet — ignore
  }
}

export function setUserProps(
  props: EventProps,
  propsOnce: EventProps = {},
) {
  if (typeof window === "undefined") return;
  try {
    posthog.setPersonProperties(
      props as Record<string, unknown>,
      propsOnce as Record<string, unknown>,
    );
  } catch {
    // ignore
  }
}

export function identifyUser(distinctId: string, traits: EventProps = {}) {
  if (typeof window === "undefined") return;
  try {
    posthog.identify(distinctId, traits);
  } catch {
    // ignore
  }
  try {
    // Stable custom-id (Clerk userId) so a person's sessions group across
    // visits; name/email becomes the human-readable friendly-name shown in the
    // Clarity dashboard instead of a GUID. Signature:
    // clarity("identify", custom-id, custom-session-id, custom-page-id, friendly-name)
    const friendly =
      (typeof traits.name === "string" && traits.name) ||
      (typeof traits.email === "string" && traits.email) ||
      undefined;
    window.clarity?.("identify", distinctId, undefined, undefined, friendly);

    // Session-level dimensions for slicing replays (e.g. paid vs free).
    window.clarity?.("set", "signed_in", "true");
    for (const [k, v] of Object.entries(traits)) {
      if (!CLARITY_TAG_KEYS.has(k)) continue;
      if (v === undefined || v === null) continue;
      const s = String(v);
      if (s.length > 0 && s.length <= 40) {
        window.clarity?.("set", k, s);
      }
    }
  } catch {
    // ignore
  }
}

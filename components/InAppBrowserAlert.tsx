"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Copy, Check, ExternalLink, X } from "lucide-react";
import { useT } from "@/lib/i18n/LanguageProvider";

interface InAppBrowserAlertProps {
  /**
   * "banner" (default): a compact one-line, in-flow bar for global chrome —
   * sits ABOVE the page header in normal document flow (never overlays it).
   * "full": the detailed explanation card for the sign-in / sign-up pages,
   * where a broken Google OAuth actually bites.
   */
  variant?: "banner" | "full";
  className?: string;
}

type InAppBrowserType = "linkedin" | "instagram" | "facebook" | "tiktok" | "twitter" | null;

// Banner dismissal survives the webview's routine reloads (memory pressure,
// app switches — most of our traffic). Per-tab (sessionStorage), so a
// genuinely new visit still gets the heads-up once.
const DISMISS_KEY = "inapp-browser-alert-dismissed";

export function InAppBrowserAlert({ variant = "banner", className = "" }: InAppBrowserAlertProps) {
  const { t } = useT();
  const [inAppBrowser, setInAppBrowser] = useState<InAppBrowserType>(null);
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || "";

    // LinkedIn in-app browser
    if (/LinkedInApp/i.test(userAgent)) {
      setInAppBrowser("linkedin");
    } else if (/Instagram/i.test(userAgent)) {
      // Instagram in-app browser
      setInAppBrowser("instagram");
    } else if (/FBAN|FBAV|FB_IAB|FBIOS|FBSS/i.test(userAgent)) {
      // Facebook in-app browser (includes Messenger)
      setInAppBrowser("facebook");
    } else if (/BytedanceWebview|TikTok/i.test(userAgent)) {
      // TikTok in-app browser
      setInAppBrowser("tiktok");
    } else if (/Twitter/i.test(userAgent)) {
      // Twitter/X in-app browser
      setInAppBrowser("twitter");
    } else {
      setInAppBrowser(null);
    }

    // The compact banner honors a previous dismissal; the full card on the
    // auth pages always shows (that's exactly where sign-in breaks).
    if (variant === "banner") {
      try {
        if (sessionStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
      } catch {
        /* ignore — private-mode storage can be unavailable */
      }
    }
  }, [variant]);

  function handleDismiss() {
    setDismissed(true);
    if (variant === "banner") {
      try {
        sessionStorage.setItem(DISMISS_KEY, "1");
      } catch {
        /* ignore */
      }
    }
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Don't render if not in an in-app browser or dismissed
  if (!inAppBrowser || dismissed) {
    return null;
  }

  const appName = {
    linkedin: "LinkedIn",
    instagram: "Instagram",
    facebook: "Facebook",
    tiktok: "TikTok",
    twitter: "Twitter/X",
  }[inAppBrowser];

  // Compact global banner — one line, in normal flow, never covers the header.
  if (variant === "banner") {
    return (
      <div className={`border-b border-amber-200 bg-amber-50 ${className}`}>
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-3 sm:px-4">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />
          <p className="min-w-0 flex-1 py-2.5 text-sm leading-snug text-amber-900">
            {t("Heads-up: sign-in works best in your browser.")}
          </p>
          <button
            onClick={handleCopyUrl}
            className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 hover:text-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? t("Copied!") : t("Copy Link")}
          </button>
          <button
            onClick={handleDismiss}
            className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-lg transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            aria-label={t("Dismiss")}
          >
            <X className="h-4 w-4 text-amber-600" />
          </button>
        </div>
      </div>
    );
  }

  // Full explanation card — for the sign-in / sign-up pages.
  return (
    <div className={`border-b-2 border-amber-300 bg-amber-50 ${className}`}>
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-start gap-3">
          {/* Warning Icon */}
          <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-amber-900 text-sm sm:text-base">
              {t("Heads-up: sign-in works best in your browser.")}
            </h3>
            <p className="text-amber-800 text-sm mt-0.5 leading-relaxed">
              {t("Google Sign-in is not supported inside the {appName} app. Please open this page in your system browser (Safari/Chrome) to sign in.", { appName })}
            </p>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button
                onClick={handleCopyUrl}
                className="inline-flex min-h-11 items-center gap-1.5 px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    {t("Copied!")}
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    {t("Copy Link")}
                  </>
                )}
              </button>

              <span className="text-amber-800 text-sm">
                {t("Then paste in Safari or Chrome")}
              </span>
            </div>

            {/* iOS specific instruction */}
            <p className="text-amber-800 text-sm mt-2 flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
              <span>
                {t("Tip: Tap the ⋯ menu icon and choose \"Open in Browser\".")}
              </span>
            </p>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 grid min-h-11 min-w-11 place-items-center hover:bg-amber-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
            aria-label={t("Dismiss")}
          >
            <X className="w-4 h-4 text-amber-600" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook for detecting in-app browser (if needed separately)
export function useInAppBrowser(): InAppBrowserType {
  const [inAppBrowser, setInAppBrowser] = useState<InAppBrowserType>(null);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || "";

    if (/LinkedInApp/i.test(userAgent)) {
      setInAppBrowser("linkedin");
    } else if (/Instagram/i.test(userAgent)) {
      setInAppBrowser("instagram");
    } else if (/FBAN|FBAV|FB_IAB|FBIOS|FBSS/i.test(userAgent)) {
      setInAppBrowser("facebook");
    } else if (/BytedanceWebview|TikTok/i.test(userAgent)) {
      setInAppBrowser("tiktok");
    } else if (/Twitter/i.test(userAgent)) {
      setInAppBrowser("twitter");
    }
  }, []);

  return inAppBrowser;
}

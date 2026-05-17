"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Copy, Check, ExternalLink, X } from "lucide-react";

interface InAppBrowserAlertProps {
  className?: string;
}

type InAppBrowserType = "linkedin" | "instagram" | "facebook" | "tiktok" | "twitter" | null;

export function InAppBrowserAlert({ className = "" }: InAppBrowserAlertProps) {
  const [inAppBrowser, setInAppBrowser] = useState<InAppBrowserType>(null);
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || "";

    // LinkedIn in-app browser
    if (/LinkedInApp/i.test(userAgent)) {
      setInAppBrowser("linkedin");
      return;
    }

    // Instagram in-app browser
    if (/Instagram/i.test(userAgent)) {
      setInAppBrowser("instagram");
      return;
    }

    // Facebook in-app browser (includes Messenger)
    if (/FBAN|FBAV|FB_IAB|FBIOS|FBSS/i.test(userAgent)) {
      setInAppBrowser("facebook");
      return;
    }

    // TikTok in-app browser
    if (/BytedanceWebview|TikTok/i.test(userAgent)) {
      setInAppBrowser("tiktok");
      return;
    }

    // Twitter/X in-app browser
    if (/Twitter/i.test(userAgent)) {
      setInAppBrowser("twitter");
      return;
    }

    setInAppBrowser(null);
  }, []);

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

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 bg-amber-50 border-b-2 border-amber-300 shadow-lg ${className}`}
    >
      <div className="max-w-4xl mx-auto px-4 py-3">
        <div className="flex items-start gap-3">
          {/* Warning Icon */}
          <div className="flex-shrink-0 w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-amber-900 text-sm sm:text-base">
              Login Issue Detected
            </h3>
            <p className="text-amber-800 text-xs sm:text-sm mt-0.5 leading-relaxed">
              Google Sign-in is not supported inside the {appName} app.
              Please open this page in your system browser (Safari/Chrome) to sign in.
            </p>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <button
                onClick={handleCopyUrl}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Link
                  </>
                )}
              </button>

              <span className="text-amber-700 text-xs">
                Then paste in Safari or Chrome
              </span>
            </div>

            {/* iOS specific instruction */}
            <p className="text-amber-700 text-xs mt-2 flex items-center gap-1.5">
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span>
                Tip: Tap the <strong>...</strong> or <strong>menu</strong> icon and select "Open in Browser"
              </span>
            </p>
          </div>

          {/* Dismiss button */}
          <button
            onClick={() => setDismissed(true)}
            className="flex-shrink-0 p-2.5 hover:bg-amber-200 rounded-lg transition-colors focus-visible:outline-none"
            aria-label="Dismiss"
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

"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { trackConversion } from "@/lib/gtag";

export function UserSyncProvider({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded } = useAuth();
  const { user } = useUser();
  const hasSynced = useRef(false);
  const hasIdentified = useRef(false);

  useEffect(() => {
    // Identify in PostHog as soon as we have a Clerk userId, even before sync.
    if (isLoaded && userId && !hasIdentified.current && typeof posthog?.identify === "function") {
      hasIdentified.current = true;
      const email = user?.emailAddresses?.[0]?.emailAddress;
      posthog.identify(userId, email ? { email } : undefined);
    }

    const syncUser = async () => {
      if (!isLoaded || !userId || hasSynced.current) {
        return;
      }

      try {
        hasSynced.current = true;

        const res = await fetch('/api/sync-user', {
          method: 'POST',
          cache: 'no-store',
        });

        if (res.ok) {
          const data = await res.json();
          if (data?.isNewUser) {
            trackConversion("signup", {
              user_email: user?.emailAddresses[0]?.emailAddress,
            });
            // PostHog signup event (separate from gtag).
            posthog.capture?.("signup_completed", {
              email: user?.emailAddresses?.[0]?.emailAddress,
            });
          }
        }
      } catch (error) {
        console.error("Failed to sync user:", error);
      }
    };

    syncUser();
  }, [userId, isLoaded, user]);

  return <>{children}</>;
}

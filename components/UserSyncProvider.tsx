"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { trackConversion } from "@/lib/gtag";
import { trackMetaEvent } from "@/lib/fbq";
import { identifyUser } from "@/lib/analytics";

export function UserSyncProvider({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded } = useAuth();
  const { user } = useUser();
  const hasSynced = useRef(false);
  const hasIdentified = useRef(false);

  useEffect(() => {
    // Identify in PostHog + Clarity as soon as we have a Clerk userId, even before sync.
    if (isLoaded && userId && !hasIdentified.current) {
      hasIdentified.current = true;
      const email = user?.emailAddresses?.[0]?.emailAddress;
      identifyUser(userId, { email });
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
            const email = user?.emailAddresses?.[0]?.emailAddress;
            trackConversion("signup", { user_email: email });
            trackMetaEvent("CompleteRegistration", { content_name: "signup" });
            trackMetaEvent("Lead", { content_name: "signup" });
            posthog.capture?.("signup_completed", { email });
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

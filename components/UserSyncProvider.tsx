"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import posthog from "posthog-js";
import { trackConversion } from "@/lib/gtag";
import { trackMetaEvent } from "@/lib/fbq";
import { identifyUser } from "@/lib/analytics";
import { useOnboardingStore } from "@/stores/onboardingStore";

export function UserSyncProvider({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded } = useAuth();
  const { user } = useUser();
  const hasSynced = useRef(false);
  const hasIdentified = useRef(false);
  const hasFlushedOnboarding = useRef(false);

  useEffect(() => {
    // Identify in PostHog + Clarity as soon as we have a Clerk userId, even before sync.
    if (isLoaded && userId && !hasIdentified.current) {
      hasIdentified.current = true;
      const email = user?.emailAddresses?.[0]?.emailAddress;
      const name = user?.fullName ?? user?.firstName ?? undefined;
      identifyUser(userId, { email, name: name ?? undefined });
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

        // Flush any picks the user made on the public role-picker before
        // signing in. We do this once per session; the store is cleared on
        // success so a returning user doesn't overwrite later edits.
        if (!hasFlushedOnboarding.current) {
          hasFlushedOnboarding.current = true;
          const { roles, clear } = useOnboardingStore.getState();
          if (roles.length > 0) {
            const rolesRes = await fetch("/api/me/roles", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ roles }),
            });
            if (rolesRes.ok) {
              clear();
              posthog.capture?.("landing_roles_persisted", { count: roles.length });
            }
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

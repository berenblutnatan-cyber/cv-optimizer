"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { trackConversion } from "@/lib/gtag";

export function UserSyncProvider({ children }: { children: React.ReactNode }) {
  const { userId, isLoaded } = useAuth();
  const { user } = useUser();
  const hasSynced = useRef(false);

  useEffect(() => {
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

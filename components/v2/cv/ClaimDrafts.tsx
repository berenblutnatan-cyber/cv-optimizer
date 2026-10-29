"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

/** Right after sign-in, move this browser's signed-out drafts into the account. */
export function ClaimDrafts() {
  const { isSignedIn } = useAuth();
  const router = useRouter();
  const done = React.useRef(false);
  React.useEffect(() => {
    if (!isSignedIn || done.current) return;
    done.current = true;
    void fetch("/api/cv/claim", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((b) => {
        if (b?.claimed > 0) router.refresh();
      })
      .catch(() => undefined);
  }, [isSignedIn, router]);
  return null;
}

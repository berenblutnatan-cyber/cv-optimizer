"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button, toast, type ButtonProps } from "@/components/ui";

/** Creates a CV (POST, never on a GET a prefetch could trigger) and opens it. */
export function NewCvButton({ children = "New CV", ...props }: ButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  return (
    <Button
      variant="primary"
      loading={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const res = await fetch("/api/cv", { method: "POST" });
          const body = await res.json().catch(() => null);
          if (!res.ok || !body?.id) throw new Error(body?.error ?? "Couldn't create a CV");
          router.push(`/cv/${body.id}`);
        } catch (err) {
          toast.error((err as Error).message);
          setBusy(false);
        }
      }}
      {...props}
    >
      <Plus /> {children}
    </Button>
  );
}

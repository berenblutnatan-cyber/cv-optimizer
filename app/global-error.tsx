"use client";

import { useEffect } from "react";
import { reloadOnceOnChunkError } from "@/lib/chunkRecovery";

/**
 * Branded replacement for Next's default "Application error: a client-side
 * exception has occurred" page. Renders its own <html>/<body> because the
 * root layout is unavailable when this boundary triggers.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("global error boundary:", error);
    reloadOnceOnChunkError(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAFAF8",
          color: "#1a1a1a",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: 480 }}>
          <h1 style={{ fontSize: 32, fontWeight: 300, marginBottom: 12 }}>
            Something went wrong.
          </h1>
          <p style={{ color: "#57534e", fontWeight: 300, marginBottom: 32 }}>
            Don&apos;t worry — your account and credits are safe. Reloading
            usually fixes this.
          </p>
          <button
            onClick={() => {
              try {
                reset();
              } finally {
                window.location.reload();
              }
            }}
            style={{
              padding: "14px 32px",
              background: "#0A2647",
              color: "#fff",
              border: "none",
              borderRadius: 2,
              fontSize: 15,
              fontWeight: 500,
              cursor: "pointer",
              letterSpacing: "0.025em",
            }}
          >
            Reload page
          </button>
        </div>
      </body>
    </html>
  );
}

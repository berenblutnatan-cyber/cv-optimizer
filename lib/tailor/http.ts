import "server-only";
import { InsufficientCredits } from "@/lib/billing/ledger";
import { TailorError } from "./store";

export function tailorErrorResponse(err: unknown, tag: string): Response {
  if (err instanceof TailorError) {
    const status = err.code === "NOT_FOUND" ? 404 : err.code === "STALE" ? 409 : 400;
    return Response.json({ error: err.message, code: err.code }, { status });
  }
  if (err instanceof InsufficientCredits) return Response.json({ error: "Out of credits", code: "NO_CREDITS" }, { status: 402 });
  console.error(`[${tag}]`, err);
  return Response.json({ error: "Something went wrong. Try again.", code: "INTERNAL" }, { status: 500 });
}

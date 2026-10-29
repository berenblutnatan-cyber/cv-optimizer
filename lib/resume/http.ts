import "server-only";
import { StoreError } from "./store";

export function storeErrorResponse(err: unknown, tag: string): Response {
  if (err instanceof StoreError) {
    const status = err.code === "NOT_FOUND" ? 404 : err.code === "CONFLICT" ? 409 : 400;
    return Response.json({ error: err.message, code: err.code }, { status });
  }
  console.error(`[${tag}]`, err);
  return Response.json({ error: "Something went wrong. Your CV is unchanged.", code: "INTERNAL" }, { status: 500 });
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

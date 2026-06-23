/**
 * Recover from stale-deployment chunk failures.
 *
 * When a new version deploys while a user is mid-session (e.g. off paying on
 * Polar's checkout), the HTML/router state they come back with can reference
 * hashed JS chunks that no longer exist on the CDN. The fetch fails, React
 * throws, and Next shows "Application error: a client-side exception has
 * occurred" — exactly what a user saw right after paying.
 *
 * A hard reload fetches fresh HTML with valid chunk URLs and fixes it. We do
 * it automatically, at most once per 30s (sessionStorage guard) so a
 * genuinely broken deploy can't put the browser in a reload loop.
 */
const RELOAD_GUARD_KEY = "chunk-error-reloaded-at";
const RELOAD_GUARD_WINDOW_MS = 30_000;

export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { name, message } = error as { name?: string; message?: string };
  if (name === "ChunkLoadError") return true;
  return /loading chunk|chunkloaderror|dynamically imported module|importing a module script failed|css chunk/i.test(
    message ?? "",
  );
}

export function reloadOnceOnChunkError(error: unknown): boolean {
  if (typeof window === "undefined" || !isChunkLoadError(error)) return false;
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_GUARD_KEY) ?? 0);
    if (Date.now() - last < RELOAD_GUARD_WINDOW_MS) return false;
    window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  } catch {
    // sessionStorage blocked — reload anyway; worst case the user retries.
  }
  window.location.reload();
  return true;
}

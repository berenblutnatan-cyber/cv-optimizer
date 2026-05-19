/**
 * Premium CV template unlocks — persisted per-user in localStorage.
 *
 * We store the unlock list client-side because templates aren't a security
 * boundary — there's nothing sensitive about which template a user picked.
 * The trade-off: if the user clears localStorage they re-pay, which at $0.20
 * (1 credit @ Starter $3/5) is an acceptable edge case.
 *
 * If we ever need true persistence, add an `unlockedTemplates Json` column
 * to the User model and swap the storage backend behind these helpers.
 */

const KEY_PREFIX = "vscout_unlocked_templates";

function storageKey(userId: string | null): string {
  // Anonymous users can also unlock (e.g. preview before signup); keyed by "anon"
  return `${KEY_PREFIX}:${userId ?? "anon"}`;
}

function read(userId: string | null): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return new Set(parsed.filter((x): x is string => typeof x === "string"));
    return new Set();
  } catch {
    return new Set();
  }
}

function write(userId: string | null, ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify([...ids]));
  } catch {
    // localStorage quota — ignore; worst case the user re-unlocks.
  }
}

export function getUnlockedTemplates(userId: string | null): string[] {
  return [...read(userId)];
}

export function isTemplateUnlocked(userId: string | null, templateId: string): boolean {
  return read(userId).has(templateId);
}

export function unlockTemplate(userId: string | null, templateId: string): void {
  const set = read(userId);
  set.add(templateId);
  write(userId, set);
}

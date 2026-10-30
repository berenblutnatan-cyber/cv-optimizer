// Shared by owner.ts (request-bound: cookies, Clerk) and store.ts (pure DB),
// so the store can be tested without a request context.
export type Owner = { userId: string; anonKeyHash: null } | { userId: null; anonKeyHash: string };
export const DRAFT_COOKIE = "hired_draft";
export const DRAFT_TTL_DAYS = 30;

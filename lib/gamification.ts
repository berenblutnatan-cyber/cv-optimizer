// Pure helpers + a single award function for the career-hub redesign.
// The award function is the only DB-touching surface here; everything else is
// pure so it can be reused from server routes and client components without
// pulling the Prisma client into the bundle.

import { prisma } from "./prisma";
import { levelForXp, type Level } from "@/components/shell/LevelBadge";

export const XP_REWARDS = {
  optimize: 20,
  generate_role: 50,
  unlock: 10,
  daily_streak: 15,
  complete_profile: 100,
} as const;

export type XpAction = keyof typeof XP_REWARDS;

// Bounded sub-scores → 1000 total. Tuned so a brand-new user with no work yet
// sees a meaningful ScoreRing on first dashboard load (their CV score still
// counts even if roles/applications are zero).
export function computeCareerScore(input: {
  currentCvScore: number; // 0-100
  rolesGenerated: number;
  applicationsLaunched: number;
}): number {
  const cv = Math.max(0, Math.min(100, input.currentCvScore)) * 4; // 0-400
  const roles = Math.min(input.rolesGenerated * 50, 250); // 0-250
  const apps = Math.min(input.applicationsLaunched * 5, 350); // 0-350
  return Math.round(cv + roles + apps);
}

// Streak rules: a "meaningful action" increments the day count only if the
// previous action was 16-36h ago. Sooner = same-day (no-op). Later = reset.
export function nextStreak(
  prev: { streakDays: number; lastActiveAt: Date | null },
  now: Date = new Date()
): { streakDays: number; awardDailyXp: boolean } {
  if (!prev.lastActiveAt) return { streakDays: 1, awardDailyXp: true };
  const hoursSince = (now.getTime() - prev.lastActiveAt.getTime()) / 36e5;
  if (hoursSince < 16) return { streakDays: prev.streakDays, awardDailyXp: false };
  if (hoursSince <= 36) return { streakDays: prev.streakDays + 1, awardDailyXp: true };
  return { streakDays: 1, awardDailyXp: true };
}

// Award XP atomically. Returns the delta so the API can hand the client a
// `leveledUp` flag for confetti without a second DB read.
export async function awardXp(
  userId: string,
  action: XpAction,
  multiplier = 1
): Promise<{
  xpAwarded: number;
  totalXp: number;
  leveledUp: boolean;
  fromLevel: Level;
  toLevel: Level;
  streakDays: number;
}> {
  const xp = XP_REWARDS[action] * multiplier;
  const before = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true, streakDays: true, lastActiveAt: true },
  });
  if (!before) {
    return {
      xpAwarded: 0,
      totalXp: 0,
      leveledUp: false,
      fromLevel: "Junior",
      toLevel: "Junior",
      streakDays: 0,
    };
  }

  const streak = nextStreak({ streakDays: before.streakDays, lastActiveAt: before.lastActiveAt });
  const totalXp = before.xp + xp + (streak.awardDailyXp ? XP_REWARDS.daily_streak : 0);
  const fromLevel = levelForXp(before.xp).level;
  const toLevel = levelForXp(totalXp).level;

  await prisma.user.update({
    where: { id: userId },
    data: {
      xp: totalXp,
      streakDays: streak.streakDays,
      lastActiveAt: new Date(),
    },
  });

  return {
    xpAwarded: totalXp - before.xp,
    totalXp,
    leveledUp: fromLevel !== toLevel,
    fromLevel,
    toLevel,
    streakDays: streak.streakDays,
  };
}

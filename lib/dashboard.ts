// Shared dashboard data loader. Used by both the server-rendered
// /dashboard page and the /api/me JSON endpoint so the two stay in lock-step.

import { prisma } from "./prisma";
import { FREE_CREDITS_FOR_NEW_USER } from "./credits";
import { computeCareerScore } from "./gamification";
import { levelForXp, type Level } from "@/components/shell/LevelBadge";

export type DashboardPayload = {
  user: {
    id: string;
    email: string;
    credits: number;
    xp: number;
    streakDays: number;
    targetRoles: string[];
    firstName: string | null;
  };
  level: { name: Level; nextXp: number; baseXp: number };
  score: { career: number; currentCv: number };
  activity: {
    rolesGenerated: number;
    applicationsLaunched: number;
    latestAnalysisAt: Date | null;
    last14DaysScores: number[]; // sparkline: latest 14 analysis scores (0-100)
  };
};

export async function getDashboardData(opts: {
  userId: string;
  email: string;
  firstName: string | null;
}): Promise<DashboardPayload> {
  const dbUser = await prisma.user.upsert({
    where: { id: opts.userId },
    update: { email: opts.email },
    create: { id: opts.userId, email: opts.email, credits: FREE_CREDITS_FOR_NEW_USER },
  });

  const [recentAnalyses, generatedCount, applicationsLaunched] = await Promise.all([
    prisma.analysis.findMany({
      where: { userId: opts.userId },
      orderBy: { createdAt: "desc" },
      take: 14,
      select: { optimizedScore: true, overallScore: true, createdAt: true },
    }),
    prisma.generatedResume.count({ where: { userId: opts.userId } }),
    prisma.optimizationLog.count({ where: { userId: opts.userId } }),
  ]);

  const last14 = recentAnalyses
    .slice()
    .reverse()
    .map((a) => a.optimizedScore ?? a.overallScore ?? 0);

  const currentCvScore =
    recentAnalyses[0]?.optimizedScore ?? recentAnalyses[0]?.overallScore ?? 0;
  const careerScore = computeCareerScore({
    currentCvScore,
    rolesGenerated: generatedCount,
    applicationsLaunched,
  });
  const { level, nextXp, baseXp } = levelForXp(dbUser.xp);

  return {
    user: {
      id: dbUser.id,
      email: dbUser.email,
      credits: dbUser.credits,
      xp: dbUser.xp,
      streakDays: dbUser.streakDays,
      targetRoles: dbUser.targetRoles,
      firstName: opts.firstName,
    },
    level: { name: level, nextXp, baseXp },
    score: { career: careerScore, currentCv: currentCvScore },
    activity: {
      rolesGenerated: generatedCount,
      applicationsLaunched,
      latestAnalysisAt: recentAnalyses[0]?.createdAt ?? null,
      last14DaysScores: last14,
    },
  };
}

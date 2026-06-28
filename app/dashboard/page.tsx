import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import {
  Briefcase,
  ClipboardList,
  CreditCard,
  FileText,
  LayoutGrid,
  MessageCircle,
  MessageSquareQuote,
  Mic,
  Wand2,
} from "lucide-react";
import { GlassCard } from "@/components/shell/GlassCard";
import { LevelBadge } from "@/components/shell/LevelBadge";
import { ScoreRing } from "@/components/shell/ScoreRing";
import { SquircleIcon } from "@/components/shell/SquircleIcon";
import { Sparkline } from "@/components/dashboard/Sparkline";
import { RoleChips } from "@/components/dashboard/RoleChips";
import { getDashboardData } from "@/lib/dashboard";
import { getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

function greetingKey(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatDay(now: Date = new Date()): string {
  return now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export default async function DashboardPage() {
  const { t } = await getServerT();
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/dashboard");
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress || "no-email";
  const data = await getDashboardData({
    userId,
    email,
    firstName: clerkUser?.firstName ?? null,
  });

  const name = data.user.firstName?.split(" ")[0] ?? t("there");

  return (
    <main className="mx-auto max-w-6xl px-4 md:px-8 pt-8 md:pt-12 space-y-6">
      {/* Greeting */}
      <GlassCard padding="lg" className="flex flex-col gap-3">
        <div className="text-sm text-white/60 font-serif italic">{formatDay()}</div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-serif italic text-3xl md:text-5xl tracking-tight text-white">
            {t(greetingKey())}, {name}
          </h1>
          <div className="flex items-center gap-3">
            <LevelBadge xp={data.user.xp} />
            {data.user.streakDays > 0 ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/8 border border-glass-border text-xs text-white/85">
                <span aria-hidden>🔥</span>
                {t("{count}-day streak", { count: data.user.streakDays })}
              </span>
            ) : null}
          </div>
        </div>
      </GlassCard>

      {/* Top row: career score + applications + roles */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <GlassCard padding="lg">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
                {t("Career Score")}
              </div>
              <div className="mt-1 text-xs text-white/70">
                {t("CV impact, roles tailored, applications launched")}
              </div>
            </div>
            <div className="text-right">
              <div className="font-serif italic text-3xl text-white tabular-nums">
                {data.score.career}
                <span className="text-base text-white/45">/1000</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-4">
            <ScoreRing value={data.score.career / 10} label={t("of 100")} size={132} />
            <div className="flex-1 min-w-0">
              <Sparkline values={data.activity.last14DaysScores} />
              <div className="mt-2 text-[11px] text-white/55">
                {t("Last 14 optimizations")}
              </div>
            </div>
          </div>
        </GlassCard>

        <GlassCard padding="lg">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
            {t("This week")}
          </div>
          <div className="mt-2 font-serif italic text-3xl text-white tabular-nums">
            {data.activity.applicationsLaunched}
            <span className="text-base text-white/45 ms-2">{t("runs")}</span>
          </div>
          <div className="mt-1 text-xs text-white/70">
            {t("CV optimizations and role generations to date.")}
          </div>
          <div className="mt-5 flex items-end gap-1 h-16">
            {Array.from({ length: 7 }).map((_, i) => {
              const hi = (i * 13 + data.activity.applicationsLaunched * 7) % 64;
              return (
                <span
                  key={i}
                  className="flex-1 rounded-sm bg-gradient-to-t from-[#8fb3ff] to-[#f5b8c8] opacity-70"
                  style={{ height: `${20 + hi}%` }}
                />
              );
            })}
          </div>
        </GlassCard>

        <GlassCard padding="lg">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
            {t("Roles you're targeting")}
          </div>
          <div className="mt-3">
            <RoleChips initial={data.user.targetRoles} />
          </div>
          {data.user.targetRoles.length === 0 ? (
            <div className="mt-3 text-xs text-white/55">
              {t("Add up to 5 roles and we'll tailor a CV for each.")}
            </div>
          ) : null}
        </GlassCard>
      </div>

      {/* Squircle launcher dock */}
      <GlassCard padding="lg">
        <div className="text-[11px] uppercase tracking-[0.18em] text-white/55 mb-4">
          {t("Jump into")}
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-4 justify-center md:justify-start">
          <SquircleIcon
            icon={MessageCircle}
            label={t("Build (chat)")}
            href="/build/chat"
            gradient={["#f5b8c8", "#8fb3ff"]}
          />
          <SquircleIcon
            icon={LayoutGrid}
            label={t("Optimize")}
            href="/optimize"
            gradient={["#f5b8c8", "#c9b8ff"]}
          />
          <SquircleIcon
            icon={Mic}
            label={t("Voice Build")}
            href="/build/voice"
            gradient={["#c9b8ff", "#8fb3ff"]}
          />
          <SquircleIcon
            icon={Wand2}
            label={t("Manual Build")}
            href="/builder"
            gradient={["#8fb3ff", "#6f8fff"]}
          />
          <SquircleIcon
            icon={Briefcase}
            label={t("Roles")}
            href="/roles"
            badge={data.activity.rolesGenerated}
            gradient={["#f5b8c8", "#f5b8c8"]}
          />
          <SquircleIcon
            icon={ClipboardList}
            label={t("Job Tracker")}
            href="/applications"
            gradient={["#8fb3ff", "#c9b8ff"]}
          />
          <SquircleIcon
            icon={MessageSquareQuote}
            label={t("Interview Prep")}
            href="/interview-prep"
            gradient={["#f5b8c8", "#c9b8ff"]}
          />
          <SquircleIcon
            icon={FileText}
            label={t("Templates")}
            href="/builder/demo"
            gradient={["#c9b8ff", "#f5b8c8"]}
          />
          <SquircleIcon
            icon={CreditCard}
            label={t("Pricing")}
            href="/pricing"
            gradient={["#8fb3ff", "#c9b8ff"]}
          />
        </div>
      </GlassCard>
    </main>
  );
}

import {
  Briefcase,
  CreditCard,
  FileText,
  LayoutGrid,
  Mic,
  Wand2,
} from "lucide-react";
import { GradientShell } from "@/components/shell/GradientShell";
import { GlassCard } from "@/components/shell/GlassCard";
import { ScoreRing } from "@/components/shell/ScoreRing";
import { SquircleIcon } from "@/components/shell/SquircleIcon";
import { LevelBadge } from "@/components/shell/LevelBadge";
import { BlurredLock } from "@/components/shell/BlurredLock";
import { Sparkline } from "@/components/dashboard/Sparkline";

export const metadata = { title: "Design System · Hired" };

// Static gallery of every primitive shipped in the redesign. Visit
// /admin/design-system in dev to QA visuals without running the full flow.
export default function DesignSystemPage() {
  return (
    <GradientShell>
      <main className="mx-auto max-w-5xl px-4 md:px-8 py-12 space-y-8">
        <header>
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/55">
            Design system
          </div>
          <h1 className="mt-2 font-serif italic text-4xl text-white">
            Career-hub primitives
          </h1>
        </header>

        <GlassCard padding="lg">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/55 mb-4">
            Score rings
          </div>
          <div className="flex flex-wrap items-end gap-8">
            <ScoreRing value={42} size={96} label="Career" />
            <ScoreRing value={73} size={128} label="CV Score" />
            <ScoreRing value={91} size={160} label="Optimized" />
          </div>
        </GlassCard>

        <GlassCard padding="lg">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/55 mb-4">
            Sparkline
          </div>
          <Sparkline values={[42, 51, 49, 60, 58, 67, 71, 70, 76, 78, 82, 80, 88, 90]} />
        </GlassCard>

        <GlassCard padding="lg">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/55 mb-4">
            Level badges
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <LevelBadge xp={120} />
            <LevelBadge xp={780} />
            <LevelBadge xp={2400} />
            <LevelBadge xp={5500} />
            <LevelBadge xp={9100} />
          </div>
        </GlassCard>

        <GlassCard padding="lg">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/55 mb-4">
            Squircle launcher
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-4">
            <SquircleIcon icon={LayoutGrid} label="Optimize" gradient={["#f5b8c8", "#c9b8ff"]} />
            <SquircleIcon icon={Mic} label="Voice" gradient={["#c9b8ff", "#8fb3ff"]} />
            <SquircleIcon icon={Wand2} label="Build" gradient={["#8fb3ff", "#6f8fff"]} />
            <SquircleIcon icon={Briefcase} label="Roles" badge={3} gradient={["#f5b8c8", "#f5b8c8"]} />
            <SquircleIcon icon={FileText} label="Templates" gradient={["#c9b8ff", "#f5b8c8"]} />
            <SquircleIcon icon={CreditCard} label="Pricing" gradient={["#8fb3ff", "#c9b8ff"]} />
          </div>
        </GlassCard>

        <GlassCard padding="lg">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/55 mb-4">
            Blurred lock
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BlurredLock locked={false}>
              <p className="text-sm text-white/85">Unlocked content reads through unchanged.</p>
            </BlurredLock>
            <BlurredLock locked={true} scoreImpact={8}>
              <p className="text-sm text-white/85">
                This is sample blurred copy that would normally describe the
                improvement. It stays readable to the model and indexable for
                a11y but appears blurred to the eye.
              </p>
            </BlurredLock>
          </div>
        </GlassCard>
      </main>
    </GradientShell>
  );
}

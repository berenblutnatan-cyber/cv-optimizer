import { GradientShell } from "@/components/shell/GradientShell";
import { OptimizerChatClient } from "@/components/optimizer/OptimizerChatClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Optimize your CV · Hired" };

// Chat-first optimizer. Kept public ("try before signup") — the client gates
// the actual scoring behind a graceful in-chat sign-in prompt. The classic
// form lives on in components/OptimizerClient.tsx if we ever need to revert.
export default function OptimizePage() {
  return (
    <GradientShell>
      <OptimizerChatClient />
    </GradientShell>
  );
}

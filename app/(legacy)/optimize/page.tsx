import { OptimizerClient } from "@/components/OptimizerClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Optimize your CV · Hired" };

// Upload-and-optimize intake (components/OptimizerClient.tsx): streams the
// deep-analysis pipeline with real progress, then lands on /results/[id]
// (Review Studio) where every suggestion applies with one tap.
export default function OptimizePage() {
  return <OptimizerClient />;
}

import { HomeClient } from "@/components/HomeClient";
import { getCvOptimizedCount } from "@/lib/kv";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OptimizePage() {
  const count = await getCvOptimizedCount();
  return <HomeClient initialCount={count} />;
}


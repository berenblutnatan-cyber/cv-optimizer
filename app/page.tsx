import { HomeClient } from "@/components/HomeClient";
import { getCvOptimizedCount } from "@/lib/kv";

export default async function HomePage() {
  const count = await getCvOptimizedCount();
  return <HomeClient initialCount={count} />;
}

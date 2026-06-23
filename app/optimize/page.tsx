import { OptimizerClient } from "@/components/OptimizerClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Optimize your CV · Hired" };

// "Optimize existing" intentionally uses the classic upload-and-optimize form
// (components/OptimizerClient.tsx). The chat-first optimizer lives on in
// components/optimizer/OptimizerChatClient.tsx if we ever want it back, but the
// landing's "Optimize existing" entry point maps to this proven form.
export default function OptimizePage() {
  return <OptimizerClient />;
}

import { StudioBuilder } from "@/components/builder/StudioBuilder";

export const dynamic = "force-dynamic";
export const metadata = { title: "Build your CV · Hired" };

// The unified builder. Anonymous-friendly (build first, sign up to save) — the
// chat endpoint enforces the usage ladder, so no hard page-level sign-in gate.
export default function ChatBuilderPage() {
  return <StudioBuilder />;
}

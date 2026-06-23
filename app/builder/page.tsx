import { StudioBuilder } from "@/components/builder/StudioBuilder";

export const dynamic = "force-dynamic";
export const metadata = { title: "Build your CV · Hired" };

// /builder and /build/chat are the same unified Enhancv-style studio now —
// AI Assistant on the left, the live CV document on the right. /builder stays
// the anonymous-friendly entry (no sign-in required to start).
export default function BuilderPage() {
  return <StudioBuilder />;
}

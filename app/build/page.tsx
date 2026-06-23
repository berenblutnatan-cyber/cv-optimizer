import type { Metadata } from "next";
import { BuildOnboarding } from "@/components/build/BuildOnboarding";

export const metadata: Metadata = {
  title: "Build your CV · Hired",
  description:
    "Answer a few quick questions and meet your first draft. Hired's guided CV builder gets you pointed at the role you want in minutes.",
};

// /build is the "Build your CV" front door — a calm, assistant-led warm-up that
// asks a few quick questions, then hands off to the right surface with a first
// draft already seeded:
//   • chat coach   → /build/chat
//   • improve a CV → /optimize
//   • blank build  → /builder
export default function BuildPage() {
  return <BuildOnboarding />;
}

import { GradientShell } from "@/components/shell/GradientShell";
import { ChatBuilderClient } from "@/components/chat/ChatBuilderClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Build your CV · Hired" };

// Anonymous-capable: visitors draft + edit their CV with the AI before signing
// up (Enhancv-style "build first, sign up to save"). The chat engine
// (/api/chat/build) already serves anonymous users; saving to history + export
// are gated behind sign-in inside ChatBuilderClient.
export default function ChatBuilderPage() {
  return (
    <GradientShell>
      <ChatBuilderClient />
    </GradientShell>
  );
}

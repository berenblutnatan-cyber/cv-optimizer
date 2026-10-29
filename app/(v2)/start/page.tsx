import type { Metadata } from "next";
import { AppHeader } from "@/components/v2/AppHeader";
import { StartFlow } from "@/components/v2/start/StartFlow";
import { voiceConfig } from "@/lib/voice/elevenlabs";

export const metadata: Metadata = { title: "Start your CV", robots: { index: false } };
export const dynamic = "force-dynamic";

export default function StartPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <AppHeader />
      <main className="flex flex-1 flex-col">
        <StartFlow voice={!!voiceConfig()} />
      </main>
    </div>
  );
}

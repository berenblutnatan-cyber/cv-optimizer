import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { GradientShell } from "@/components/shell/GradientShell";
import { Sidebar } from "@/components/shell/Sidebar";
import { MicPermissionGate } from "@/components/voice/MicPermissionGate";
import { VoiceBuilderClient } from "@/components/voice/VoiceBuilderClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Talk it out · Hired" };

export default async function VoiceBuilderPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/build/voice");
  return (
    <GradientShell>
      <Sidebar />
      <main className="mx-auto max-w-3xl px-4 md:px-8 pt-10 md:pt-16 pb-24 md:pb-12 md:pl-20">
        <header className="text-center space-y-2">
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/55">
            Voice CV builder
          </div>
          <h1 className="font-serif italic text-4xl md:text-5xl text-white leading-tight">
            Tell us your story.
          </h1>
          <p className="text-white/70 md:text-lg max-w-md mx-auto">
            We'll ask you a few questions for about three minutes, then build
            your CV from what you said.
          </p>
        </header>
        <div className="mt-10">
          <MicPermissionGate>
            <VoiceBuilderClient />
          </MicPermissionGate>
        </div>
      </main>
    </GradientShell>
  );
}

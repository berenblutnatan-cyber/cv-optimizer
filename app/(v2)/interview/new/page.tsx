import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { FileText, LogIn, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { listResumeCards } from "@/lib/resume/store";
import { hasActiveSubscription } from "@/lib/subscription";
import { interviewVoiceConfig } from "@/lib/voice/elevenlabs";
import { VOICE } from "@/lib/voice/protocol";
import { unlimitedSecondsUsed } from "@/lib/voice/sessions";
import { Button, EmptyState } from "@/components/ui";
import { AppHeader } from "@/components/v2/AppHeader";
import { InterviewSetup } from "@/components/v2/interview/InterviewSetup";

export const metadata: Metadata = { title: "New practice", robots: { index: false } };
export const dynamic = "force-dynamic";

type Search = { cv?: string; tailoring?: string; again?: string };

export default async function NewInterviewPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const { userId } = await auth();

  const body = async () => {
    if (!userId) {
      const back = `/interview/new${sp.cv ? `?cv=${encodeURIComponent(sp.cv)}${sp.tailoring ? `&tailoring=${encodeURIComponent(sp.tailoring)}` : ""}` : ""}`;
      return (
        <div className="rounded-panel border border-hairline bg-surface">
          <EmptyState
            icon={<LogIn />}
            title="Sign in to practice"
            action={
              <Button asChild variant="primary" size="lg">
                <Link href={`/sign-in?redirect_url=${encodeURIComponent(back)}`}>
                  <LogIn /> Sign in
                </Link>
              </Button>
            }
          />
        </div>
      );
    }

    const [cards, jobs, user, again] = await Promise.all([
      listResumeCards({ userId, anonKeyHash: null }),
      prisma.tailoring.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 60, select: { id: true, resumeId: true, jobTitle: true, company: true } }),
      prisma.user.findUnique({ where: { id: userId } }),
      sp.again ? prisma.interviewSession.findFirst({ where: { id: sp.again, userId }, select: { resumeId: true, tailoringId: true, jdText: true, jobTitle: true, company: true } }) : null,
    ]);
    const cvs = cards.filter((c) => c.doc.content.experience.length > 0).map((c) => ({ id: c.id, title: c.title || "Untitled CV" }));
    if (cvs.length === 0) {
      return (
        <div className="rounded-panel border border-hairline bg-surface">
          <EmptyState
            icon={<FileText />}
            title={cards.length > 0 ? "Add your experience to a CV first" : "Make a CV first"}
            action={
              <Button asChild variant="primary" size="lg">
                <Link href={cards[0] ? `/cv/${cards[0].id}` : "/start"}>{cards[0] ? "Open CV" : <><Plus /> New CV</>}</Link>
              </Button>
            }
          />
        </div>
      );
    }

    const wanted = again?.resumeId ?? sp.cv;
    const cvId = cvs.some((c) => c.id === wanted) ? wanted! : cvs[0].id;
    // "Practice again" on a pasted job brings the job back; on a tailored job, picks it.
    const tailoringId = again ? again.tailoringId : (sp.tailoring ?? null);
    const unlimited = !!user && hasActiveSubscription(user);
    const voiceOverFairUse = unlimited && (await unlimitedSecondsUsed(prisma, userId)) >= VOICE.unlimitedSecondsPer30d;

    return (
      <InterviewSetup
        cvs={cvs}
        jobs={jobs.filter((j) => j.resumeId).map((j) => ({ id: j.id, cvId: j.resumeId!, jobTitle: j.jobTitle, company: j.company }))}
        initial={{
          cvId,
          tailoringId,
          jd: again && !again.tailoringId ? again.jdText : "",
          jobTitle: again && !again.tailoringId ? again.jobTitle : "",
          company: again && !again.tailoringId ? again.company : "",
        }}
        voiceAvailable={!!interviewVoiceConfig()}
        balance={user?.credits ?? 0}
        unlimited={unlimited}
        voiceOverFairUse={voiceOverFairUse}
      />
    );
  };

  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader />
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10 md:px-8">
        <h1 className="text-h1 font-semibold text-ink">Practice interview</h1>
        {await body()}
      </main>
    </div>
  );
}

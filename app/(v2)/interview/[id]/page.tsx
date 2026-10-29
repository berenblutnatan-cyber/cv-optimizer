import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { getInterview, InterviewError, publicInterview } from "@/lib/interview/store";
import { AppHeader } from "@/components/v2/AppHeader";
import { InterviewRoom } from "@/components/v2/interview/InterviewRoom";

export const metadata: Metadata = { title: "Interview practice", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) redirect(`/sign-in?redirect_url=${encodeURIComponent(`/interview/${id}`)}`);
  const row = await getInterview(userId, id).catch((err) => {
    if (err instanceof InterviewError) return null;
    throw err;
  });
  if (!row) notFound();

  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader />
      <InterviewRoom initial={publicInterview(row)} />
    </div>
  );
}

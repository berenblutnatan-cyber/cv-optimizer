import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Briefcase, LogIn } from "lucide-react";
import { listJobs } from "@/lib/jobs/store";
import { listResumeCards } from "@/lib/resume/store";
import { Button, EmptyState } from "@/components/ui";
import { AppHeader } from "@/components/v2/AppHeader";
import { JobsBoard } from "@/components/v2/jobs/JobsBoard";

export const metadata: Metadata = { title: "Jobs", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function JobsPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const { job } = await searchParams;
  const { userId } = await auth();
  const [jobs, cards] = userId ? await Promise.all([listJobs(userId), listResumeCards({ userId, anonKeyHash: null })]) : [[], []];

  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        {!userId ? (
          <>
            <h1 className="mb-8 text-h1 font-semibold text-ink">Jobs</h1>
            <div className="rounded-panel border border-hairline bg-surface">
              <EmptyState
                icon={<Briefcase />}
                title="Sign in to track jobs"
                action={
                  <Button asChild variant="primary" size="lg">
                    <Link href={`/sign-in?redirect_url=${encodeURIComponent("/jobs")}`}>
                      <LogIn /> Sign in
                    </Link>
                  </Button>
                }
              />
            </div>
          </>
        ) : (
          <JobsBoard initialJobs={jobs} cvs={cards.map((c) => ({ id: c.id, title: c.title || "Untitled CV" }))} openId={job && jobs.some((j) => j.id === job) ? job : null} />
        )}
      </main>
    </div>
  );
}

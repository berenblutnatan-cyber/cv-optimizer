import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { Keyboard, LogIn, MessagesSquare, Mic, Plus } from "lucide-react";
import { listInterviews } from "@/lib/interview/store";
import { Badge, Button, EmptyState } from "@/components/ui";
import { AppHeader } from "@/components/v2/AppHeader";
import { RelativeTime } from "@/components/v2/cv/RelativeTime";

export const metadata: Metadata = { title: "Interview practice", robots: { index: false } };
export const dynamic = "force-dynamic";

function NewLink({ size }: { size?: "md" | "lg" }) {
  return (
    <Button asChild variant="primary" size={size}>
      <Link href="/interview/new">
        <Plus /> New practice
      </Link>
    </Button>
  );
}

const STATUS: Record<string, { label: string; tone: "neutral" | "accent" | "warn" | "outline" }> = {
  ready: { label: "Not started", tone: "outline" },
  live: { label: "In progress", tone: "accent" },
  scoring: { label: "Scoring", tone: "accent" },
  failed: { label: "Not scored", tone: "neutral" },
};

export default async function InterviewListPage() {
  const { userId } = await auth();
  const items = userId ? await listInterviews(userId) : [];

  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 md:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h1 className="text-h1 font-semibold text-ink">Interview practice</h1>
          {items.length > 0 && <NewLink />}
        </div>

        {!userId ? (
          <div className="rounded-panel border border-hairline bg-surface">
            <EmptyState
              icon={<MessagesSquare />}
              title="Sign in to practice"
              action={
                <Button asChild variant="primary" size="lg">
                  <Link href={`/sign-in?redirect_url=${encodeURIComponent("/interview")}`}>
                    <LogIn /> Sign in
                  </Link>
                </Button>
              }
            />
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-panel border border-hairline bg-surface">
            <EmptyState icon={<MessagesSquare />} title="No practice yet" action={<NewLink size="lg" />} />
          </div>
        ) : (
          <ul className="overflow-hidden rounded-panel border border-hairline bg-surface">
            {items.map((iv) => {
              const status = iv.status === "done" ? null : (STATUS[iv.status] ?? STATUS.failed);
              return (
                <li key={iv.id} className="border-b border-hairline last:border-b-0">
                  <Link href={`/interview/${iv.id}`} className="flex min-h-16 items-center gap-4 px-4 py-3 transition-colors duration-micro hover:bg-surface-2/60 md:px-5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-control bg-surface-2 text-ink-3 [&_svg]:size-4" aria-label={iv.mode === "voice" ? "Voice" : "Typed"}>
                      {iv.mode === "voice" ? <Mic /> : <Keyboard />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body font-medium text-ink">{iv.jobTitle || iv.company || "Practice interview"}</span>
                      <span className="block truncate text-body text-ink-2">
                        {iv.jobTitle && iv.company ? `${iv.company} · ` : ""}
                        <RelativeTime iso={iv.createdAt} />
                      </span>
                    </span>
                    {status ? (
                      <Badge tone={status.tone}>{status.label}</Badge>
                    ) : (
                      <span className="tabular text-h3 font-semibold text-ink" aria-label={`Score ${iv.overall} of 100`}>
                        {iv.overall}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}

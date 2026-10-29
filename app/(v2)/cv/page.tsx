import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { getTemplateEntry } from "@/lib/templates/registry";
import { currentOwner } from "@/lib/resume/owner";
import { listResumes } from "@/lib/resume/store";
import { EmptyState, ThemeToggle } from "@/components/ui";
import { NewCvButton } from "@/components/v2/cv/NewCvButton";
import { RelativeTime } from "@/components/v2/cv/RelativeTime";

export const metadata: Metadata = { title: "Your CVs", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CvListPage() {
  const owner = await currentOwner();
  const resumes = owner ? await listResumes(owner) : [];

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 md:px-8">
          <Link href="/cv" className="flex items-center gap-2.5">
            <span className="grid size-7 place-items-center rounded-control bg-ink text-dense font-semibold text-canvas">H</span>
            <span className="text-emph font-semibold text-ink">Hired</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 md:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h1 className="text-h1 font-semibold text-ink">Your CVs</h1>
          {resumes.length > 0 && <NewCvButton />}
        </div>

        {resumes.length === 0 ? (
          <div className="rounded-panel border border-hairline bg-surface">
            <EmptyState icon={<FileText />} title="No CVs yet" action={<NewCvButton size="lg">Start a CV</NewCvButton>} />
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {resumes.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/cv/${r.id}`}
                  className="group flex h-full flex-col gap-4 rounded-card border border-hairline bg-surface p-5 shadow-card transition-[border-color,transform] hover:-translate-y-0.5 hover:border-hairline-strong"
                >
                  <span aria-hidden className="h-24 rounded-control border border-hairline" style={{ background: getTemplateEntry(r.template)?.preview }} />
                  <span className="min-w-0">
                    <span className="block truncate text-emph font-semibold text-ink">{r.title || "Untitled CV"}</span>
                    <span className="flex items-center gap-1.5 text-dense text-ink-2">
                      {getTemplateEntry(r.template)?.name ?? r.template} · <RelativeTime iso={r.updatedAt.toISOString()} />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

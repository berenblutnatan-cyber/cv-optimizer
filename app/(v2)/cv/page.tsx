import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { getTemplateEntry } from "@/lib/templates/registry";
import { currentOwner } from "@/lib/resume/owner";
import { listResumeCards } from "@/lib/resume/store";
import { toTemplateData } from "@/lib/resume/view";
import { Button, EmptyState } from "@/components/ui";
import { AppHeader } from "@/components/v2/AppHeader";
import { CvCard } from "@/components/v2/cv/CvCard";

export const metadata: Metadata = { title: "Your CVs", robots: { index: false } };
export const dynamic = "force-dynamic";

function NewCvLink({ size }: { size?: "md" | "lg" }) {
  return (
    <Button asChild variant="primary" size={size}>
      <Link href="/start">
        <Plus /> New CV
      </Link>
    </Button>
  );
}

export default async function CvListPage() {
  const owner = await currentOwner();
  const resumes = owner ? await listResumeCards(owner) : [];

  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <h1 className="text-h1 font-semibold text-ink">Your CVs</h1>
          {resumes.length > 0 && <NewCvLink />}
        </div>

        {resumes.length === 0 ? (
          <div className="rounded-panel border border-hairline bg-surface">
            <EmptyState icon={<FileText />} title="No CVs yet" action={<NewCvLink size="lg" />} />
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {resumes.map((r, i) => (
              <CvCard
                key={r.id}
                id={r.id}
                title={r.title || "Untitled CV"}
                meta={getTemplateEntry(r.doc.design.template)?.name ?? r.doc.design.template}
                updatedAt={r.updatedAt.toISOString()}
                data={toTemplateData(r.doc.content)}
                design={r.doc.design}
                eager={i < 6}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

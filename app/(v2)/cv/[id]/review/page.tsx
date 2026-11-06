import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentOwner } from "@/lib/resume/owner";
import { loadResume } from "@/lib/resume/store";
import { getServerT } from "@/lib/i18n/server";
import { ReviewView } from "@/components/v2/review/ReviewView";

export const dynamic = "force-dynamic";

async function load(id: string) {
  const owner = await currentOwner();
  return owner ? loadResume(id, owner) : null;
}

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerT();
  return { title: t("Your CV, read"), robots: { index: false } };
}

// After an upload: the deep read of the CV for its target job, before any edit.
export default async function CvReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cv = await load(id);
  if (!cv) notFound();
  return <ReviewView key={cv.id} id={cv.id} doc={cv.doc} />;
}

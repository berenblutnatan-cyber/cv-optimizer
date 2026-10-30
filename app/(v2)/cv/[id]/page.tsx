import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentOwner } from "@/lib/resume/owner";
import { loadResume } from "@/lib/resume/store";
import { documentTitle } from "@/lib/resume/document";
import { EditorShell } from "@/components/v2/editor/EditorShell";

export const dynamic = "force-dynamic";

async function load(id: string) {
  const owner = await currentOwner();
  const cv = owner ? await loadResume(id, owner) : null;
  return cv ? { ...cv, signedIn: !!owner?.userId } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const cv = await load((await params).id);
  return { title: cv ? documentTitle(cv.doc) : "CV not found", robots: { index: false } };
}

export default async function CvEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const { talk, panel } = await searchParams;
  const cv = await load(id);
  if (!cv) notFound();
  // Keyed by id: a different CV is a fresh editor with its own save queue.
  return <EditorShell key={cv.id} id={cv.id} initial={{ doc: cv.doc, lastSeq: cv.lastSeq }} signedIn={cv.signedIn} startInTalk={talk === "1"} startPanel={panel === "tailor" ? "tailor" : undefined} />;
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { currentOwner } from "@/lib/resume/owner";
import { loadResume } from "@/lib/resume/store";
import { documentTitle } from "@/lib/resume/document";
import { EditorShell } from "@/components/v2/editor/EditorShell";

export const dynamic = "force-dynamic";

async function load(id: string) {
  const owner = await currentOwner();
  return owner ? loadResume(id, owner) : null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const cv = await load((await params).id);
  return { title: cv ? documentTitle(cv.doc) : "CV not found", robots: { index: false } };
}

export default async function CvEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cv = await load(id);
  if (!cv) notFound();
  return <EditorShell id={cv.id} initial={{ doc: cv.doc, lastSeq: cv.lastSeq }} />;
}

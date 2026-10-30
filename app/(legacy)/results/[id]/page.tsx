// Review Studio loader — auth-scoped read of one saved analysis.

import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { ReviewStudio } from "@/components/review/ReviewStudio";

export const dynamic = "force-dynamic";

export default async function ResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) redirect("/optimize");

  const { id } = await params;
  const analysis = await prisma.analysis.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      jobTitle: true,
      overallScore: true,
      optimizedScore: true,
      raw: true,
      cvText: true,
      createdAt: true,
    },
  });
  if (!analysis || analysis.userId !== userId) notFound();

  return (
    <ReviewStudio
      analysisId={analysis.id}
      jobTitle={analysis.jobTitle}
      raw={analysis.raw as Record<string, unknown>}
      cvText={analysis.cvText}
      createdAt={analysis.createdAt.toISOString()}
    />
  );
}

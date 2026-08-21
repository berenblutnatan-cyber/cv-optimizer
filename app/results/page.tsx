// Analysis history — results finally persist. Each run links to its Review
// Studio at /results/[id]; closing a tab no longer costs a credit.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ChevronRight, FileSearch } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ShellNav } from "@/components/ShellNav";
import { getServerT } from "@/lib/i18n/server";
import { scoreColor } from "@/lib/score/bands";

export const dynamic = "force-dynamic";

export default async function ResultsHistoryPage() {
  const { userId } = await auth();
  if (!userId) redirect("/optimize");

  const { t } = await getServerT();
  const analyses = await prisma.analysis.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, jobTitle: true, overallScore: true, optimizedScore: true, createdAt: true },
  });

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex flex-col">
      <ShellNav active="optimizer" />
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-serif text-3xl font-light text-brand-ink">{t("Your analyses")}</h1>
          <Link
            href="/optimize"
            className="inline-flex items-center px-4 py-2.5 bg-brand-navy hover:bg-brand-navy-hover text-white text-sm font-medium rounded-sm transition-colors"
          >
            {t("New Analysis")}
          </Link>
        </div>

        {analyses.length === 0 ? (
          <div className="bg-white rounded-sm border border-stone-200 p-10 text-center">
            <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-brand-navy/5 flex items-center justify-center">
              <FileSearch className="w-6 h-6 text-brand-navy" strokeWidth={1.5} />
            </div>
            <p className="text-stone-500 font-light">{t("No analyses yet.")}</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {analyses.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/results/${a.id}`}
                  className="flex items-center gap-4 bg-white rounded-sm border border-stone-200 px-5 py-4 hover:border-brand-navy/40 hover:shadow-sm transition-all"
                >
                  {typeof a.overallScore === "number" ? (
                    <span
                      className="text-xl font-bold tabular-nums w-10 text-center flex-shrink-0"
                      style={{ color: scoreColor(a.overallScore) }}
                    >
                      {a.overallScore}
                    </span>
                  ) : (
                    <span className="text-xl font-bold text-stone-300 w-10 text-center flex-shrink-0">–</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-brand-ink truncate">
                      {a.jobTitle || t("General Role")}
                    </div>
                    <div className="text-sm text-stone-400 mt-0.5">
                      {a.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {typeof a.optimizedScore === "number" && typeof a.overallScore === "number" && a.optimizedScore > a.overallScore
                        ? ` · +${a.optimizedScore - a.overallScore} ${t("possible")}`
                        : ""}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-300 flex-shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}

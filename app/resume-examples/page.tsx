import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { RESUME_EXAMPLES } from "@/lib/resumeExamples";
import { getServerT } from "@/lib/i18n/server";

export const metadata: Metadata = {
  title: "Resume Examples by Job Title (2026) | Hired",
  description:
    "Free, recruiter-approved resume examples by job title — software engineer, product manager, data analyst, nurse and more. Copy one into our AI builder and tailor it in minutes.",
  alternates: { canonical: "/resume-examples" },
  openGraph: {
    title: "Resume Examples by Job Title | Hired",
    description: "Free resume examples you can edit with AI in minutes.",
    url: "/resume-examples",
    type: "website",
  },
};

export default async function ResumeExamplesIndex() {
  const { t } = await getServerT();
  return (
    <main className="min-h-screen bg-[#F8F7F4]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <header className="text-center max-w-2xl mx-auto">
          <p className="text-[12px] uppercase tracking-[0.18em] text-[#B8860B] font-semibold">{t("Resume examples")}</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-[#0A2647]">
            {t("Resume examples that actually get interviews")}
          </h1>
          <p className="mt-3 text-stone-600 leading-relaxed">
            {t("Real-world resume examples by job title, written the way recruiters and ATS want to read them — quantified impact, strong verbs, clean structure. Pick one, then make it yours with AI in minutes.")}
          </p>
        </header>

        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {RESUME_EXAMPLES.map((ex) => (
            <Link
              key={ex.slug}
              href={`/resume-examples/${ex.slug}`}
              className="group rounded-2xl bg-white border border-stone-200 p-5 hover:border-[#0A2647]/30 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] uppercase tracking-[0.14em] text-stone-400">{ex.category}</span>
                <span className="text-[11px] text-stone-400">{ex.seniority}</span>
              </div>
              <h2 className="mt-1 text-lg font-semibold text-[#0A2647]">{t("{role} resume example", { role: ex.role })}</h2>
              <p className="mt-1.5 text-[13.5px] text-stone-600 leading-relaxed line-clamp-3">{ex.blurb}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-[#B8860B] group-hover:gap-2 transition-all">
                {t("View example")} <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link
            href="/build/chat"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#0A2647] text-white text-sm font-semibold hover:bg-[#0d3259] transition-colors"
          >
            {t("Build my resume free")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}

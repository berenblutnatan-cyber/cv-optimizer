import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EXAMPLE_SLUGS, getExample } from "@/lib/resumeExamples";
import { ExampleResume } from "@/components/examples/ExampleResume";
import { UseExampleButton } from "@/components/examples/UseExampleButton";
import { ExampleViewTracker } from "@/components/examples/ExampleViewTracker";
import { getServerT } from "@/lib/i18n/server";

// Pre-render every example at build time.
export function generateStaticParams() {
  return EXAMPLE_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const ex = getExample(slug);
  if (!ex) return { title: "Resume example not found | Hired" };
  const title = `${ex.role} Resume Example (2026) | Hired`;
  return {
    title,
    description: ex.blurb,
    alternates: { canonical: `/resume-examples/${ex.slug}` },
    openGraph: { title, description: ex.blurb, url: `/resume-examples/${ex.slug}`, type: "article" },
  };
}

export default async function ResumeExamplePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ex = getExample(slug);
  if (!ex) notFound();

  const { t } = await getServerT();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${ex.role} Resume Example`,
    about: `${ex.role} resume`,
    articleSection: ex.category,
    description: ex.blurb,
    author: { "@type": "Organization", name: "Hired" },
    publisher: { "@type": "Organization", name: "Hired" },
  };

  return (
    <main className="min-h-screen bg-[#F8F7F4]">
      <ExampleViewTracker slug={ex.slug} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <Link
          href="/resume-examples"
          className="inline-flex items-center gap-1.5 text-[13px] text-stone-500 hover:text-[#0A2647] transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> {t("All resume examples")}
        </Link>

        <header className="mt-5">
          <p className="text-[12px] uppercase tracking-[0.18em] text-[#B8860B] font-semibold">
            {ex.category} · {ex.seniority}
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-[#0A2647]">{t("{role} resume example", { role: ex.role })}</h1>
          <p className="mt-3 text-stone-600 leading-relaxed">{ex.blurb}</p>
          <div className="mt-5">
            <UseExampleButton data={ex.data} slug={ex.slug} />
          </div>
        </header>

        <div className="mt-8">
          <ExampleResume data={ex.data} />
        </div>

        <section className="mt-10 rounded-2xl bg-[#0A2647] text-white p-6 sm:p-8 text-center">
          <h2 className="text-xl font-bold">{t("Make this resume yours")}</h2>
          <p className="mt-2 text-white/80 text-sm leading-relaxed max-w-xl mx-auto">
            {t("Load this example into the builder and our AI tailors it to your experience and target job — rewriting bullets, adding keywords, and scoring it live as you go.")}
          </p>
          <div className="mt-5 flex justify-center">
            <UseExampleButton
              data={ex.data}
              slug={ex.slug}
              label={t("Use this example")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-[#0A2647] text-sm font-semibold hover:bg-stone-100 transition-colors"
            />
          </div>
        </section>
      </div>
    </main>
  );
}

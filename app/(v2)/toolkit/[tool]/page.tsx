import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ipFromHeaders } from "@/lib/limits";
import { ArrowLeft } from "lucide-react";
import { snapshotForPrompt } from "@/lib/chat/cvTools";
import { listResumeCards } from "@/lib/resume/store";
import { getServerT } from "@/lib/i18n/server";
import { freeToolsLeft } from "@/lib/toolkit/quota";
import { isToolId, TOOLS } from "@/lib/toolkit/tools";
import { Button } from "@/components/ui";
import { AppHeader } from "@/components/v2/AppHeader";
import { TOOL_ICONS } from "@/components/v2/toolkit/icons";
import { ToolRunner } from "@/components/v2/toolkit/ToolRunner";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ tool: string }> }): Promise<Metadata> {
  const { tool } = await params;
  const { t } = await getServerT();
  return { title: t(isToolId(tool) ? TOOLS[tool].title : "Toolkit") };
}

export default async function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool } = await params;
  if (!isToolId(tool)) notFound();
  const spec = TOOLS[tool];
  const Icon = TOOL_ICONS[spec.icon];
  const { userId } = await auth();
  const { t, dir } = await getServerT();
  const ip = ipFromHeaders(await headers());
  const [free, cards] = await Promise.all([freeToolsLeft([tool], userId ? `u:${userId}` : `ip:${ip}`), userId ? listResumeCards({ userId, anonKeyHash: null }) : Promise.resolve([])]);
  const cvs = cards.filter((c) => c.doc.content.experience.length > 0).map((c) => ({ id: c.id, title: c.title || "Untitled CV", text: snapshotForPrompt(c.doc.content).slice(0, 30_000) }));

  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader />
      <main dir={dir} className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
        <Button asChild variant="ghost" size="sm" className="-ms-2 mb-2 w-fit">
          <Link href="/toolkit">
            <ArrowLeft className="rtl:rotate-180" /> {t("Toolkit")}
          </Link>
        </Button>
        <h1 className="mb-6 flex items-center gap-3 text-h1 font-semibold text-ink">
          <span className="grid size-10 place-items-center rounded-card bg-surface-2 text-ink-2 [&_svg]:size-5">
            <Icon />
          </span>
          {t(spec.title)}
        </h1>
        <ToolRunner spec={spec} cvs={cvs} signedIn={!!userId} freeToday={free.length === 1} />
      </main>
    </div>
  );
}

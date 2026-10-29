import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { ipFromHeaders } from "@/lib/limits";
import { freeToolsLeft } from "@/lib/toolkit/quota";
import { isToolId, TOOL_IDS, TOOLS } from "@/lib/toolkit/tools";
import { Badge } from "@/components/ui";
import { AppHeader } from "@/components/v2/AppHeader";
import { TOOL_ICONS } from "@/components/v2/toolkit/icons";

export const metadata: Metadata = { title: "Toolkit" };
export const dynamic = "force-dynamic";

export default async function ToolkitPage({ searchParams }: { searchParams: Promise<{ tool?: string }> }) {
  // Old links (/toolkit?tool=…) open the tool.
  const { tool } = await searchParams;
  if (tool && isToolId(tool)) redirect(`/toolkit/${tool}`);

  const { userId } = await auth();
  const ip = ipFromHeaders(await headers());
  const free = new Set(await freeToolsLeft(TOOL_IDS, userId ? `u:${userId}` : `ip:${ip}`));

  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 md:px-8">
        <h1 className="mb-8 text-h1 font-semibold text-ink">Toolkit</h1>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOL_IDS.map((id) => {
            const spec = TOOLS[id];
            const Icon = TOOL_ICONS[spec.icon];
            return (
              <li key={id}>
                <Link
                  href={`/toolkit/${id}`}
                  className="group flex h-full flex-col gap-3 rounded-panel border border-hairline bg-surface p-5 transition-[border-color,box-shadow] duration-micro hover:border-hairline-strong hover:shadow-card"
                >
                  <span className="flex items-center justify-between">
                    <span className="grid size-10 place-items-center rounded-card bg-surface-2 text-ink-2 transition-colors duration-micro group-hover:text-accent-ink [&_svg]:size-5">
                      <Icon />
                    </span>
                    {/* Free once a day: only a tool already used today says so. */}
                    {!free.has(id) && <Badge tone="neutral">{userId ? "1 credit" : "Used today"}</Badge>}
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="text-emph font-semibold text-ink">{spec.title}</span>
                    <span className="text-body text-ink-2">{spec.tagline}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}

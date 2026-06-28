import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { GradientShell } from "@/components/shell/GradientShell";
import { Sidebar } from "@/components/shell/Sidebar";
import { prisma } from "@/lib/prisma";
import { RolesDeck } from "@/components/roles/RolesDeck";
import { getServerT } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your roles · Hired" };

export default async function RolesPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/roles");
  const { t } = await getServerT();

  const [cards, user] = await Promise.all([
    prisma.generatedResume.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        role: true,
        score: true,
        unlocked: true,
        content: true,
        error: true,
        createdAt: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { targetRoles: true, credits: true },
    }),
  ]);

  return (
    <GradientShell>
      <Sidebar />
      <main className="mx-auto max-w-6xl px-4 md:px-8 pt-8 md:pt-12 pb-24 md:pb-12 md:ps-20">
        <header className="space-y-2">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/55">
            {t("Multi-role")}
          </div>
          <h1 className="font-serif italic text-3xl md:text-5xl text-white leading-tight">
            {t("One CV per role you're chasing.")}
          </h1>
          <p className="text-white/70 md:text-lg">
            {t("We tailor a fresh CV for each target role. The first is free — unlock the rest as you go.")}
          </p>
        </header>

        <RolesDeck
          targetRoles={user?.targetRoles ?? []}
          credits={user?.credits ?? 0}
          initialCards={cards.map((c) => ({
            ...c,
            createdAt: c.createdAt.toISOString(),
          }))}
        />
      </main>
    </GradientShell>
  );
}

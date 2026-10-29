import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Users,
  Sparkles,
  CreditCard,
  DollarSign,
  TrendingUp,
  Calendar,
  Mail,
  ArrowRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function startOfTodayUTC(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function fmtDate(d: Date) {
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtMoney(n: number) {
  return `$${n.toFixed(2)}`;
}

async function safe<T>(p: Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await p;
  } catch (err) {
    console.error(`[admin] query failed (${label}):`, err);
    return fallback;
  }
}

export default async function AdminPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=/admin");

  const admin = await getAdminUser();
  if (!admin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-8 max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <Users className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Access denied</h1>
          <p className="text-slate-600 text-sm">
            This dashboard is restricted to the site owner.
          </p>
        </div>
      </div>
    );
  }

  const today = startOfTodayUTC();
  const d7 = daysAgo(7);
  const d30 = daysAgo(30);

  // Each query is independently fault-tolerant: a single Neon hiccup or schema
  // drift on one query won't take down the whole dashboard.
  const [
    signupsToday,
    signups7d,
    signups30d,
    signupsAll,
    optsToday,
    opts7d,
    opts30d,
    optsAll,
    purchasesToday,
    purchases7d,
    purchases30d,
    purchasesAll,
    revenueAggToday,
    revenueAgg7d,
    revenueAgg30d,
    revenueAggAll,
    recentUsers,
    recentPurchases,
    recentOpts,
    cohortUsers,
    cohortOptUserIds,
    cohortPurchaseUserIds,
  ] = await Promise.all([
    safe(prisma.user.count({ where: { createdAt: { gte: today } } }), 0, "signupsToday"),
    safe(prisma.user.count({ where: { createdAt: { gte: d7 } } }), 0, "signups7d"),
    safe(prisma.user.count({ where: { createdAt: { gte: d30 } } }), 0, "signups30d"),
    safe(prisma.user.count(), 0, "signupsAll"),

    safe(prisma.optimizationLog.count({ where: { createdAt: { gte: today } } }), 0, "optsToday"),
    safe(prisma.optimizationLog.count({ where: { createdAt: { gte: d7 } } }), 0, "opts7d"),
    safe(prisma.optimizationLog.count({ where: { createdAt: { gte: d30 } } }), 0, "opts30d"),
    safe(prisma.optimizationLog.count(), 0, "optsAll"),

    safe(prisma.purchase.count({ where: { createdAt: { gte: today } } }), 0, "purchasesToday"),
    safe(prisma.purchase.count({ where: { createdAt: { gte: d7 } } }), 0, "purchases7d"),
    safe(prisma.purchase.count({ where: { createdAt: { gte: d30 } } }), 0, "purchases30d"),
    safe(prisma.purchase.count(), 0, "purchasesAll"),

    safe(
      prisma.purchase.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: today } } }),
      { _sum: { amount: 0 } },
      "revToday"
    ),
    safe(
      prisma.purchase.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: d7 } } }),
      { _sum: { amount: 0 } },
      "rev7d"
    ),
    safe(
      prisma.purchase.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: d30 } } }),
      { _sum: { amount: 0 } },
      "rev30d"
    ),
    safe(
      prisma.purchase.aggregate({ _sum: { amount: true } }),
      { _sum: { amount: 0 } },
      "revAll"
    ),

    safe(
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: { id: true, email: true, credits: true, createdAt: true },
      }),
      [] as Array<{ id: string; email: string; credits: number; createdAt: Date }>,
      "recentUsers"
    ),
    safe(
      prisma.purchase.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { user: { select: { email: true } } },
      }),
      [] as Array<{
        id: string;
        amount: number;
        plan: string;
        createdAt: Date;
        user: { email: string | null } | null;
      }>,
      "recentPurchases"
    ),
    safe(
      prisma.optimizationLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          userEmail: true,
          jobTitle: true,
          companyName: true,
          matchScore: true,
          createdAt: true,
        },
      }),
      [] as Array<{
        id: string;
        userEmail: string;
        jobTitle: string | null;
        companyName: string | null;
        matchScore: number | null;
        createdAt: Date;
      }>,
      "recentOpts"
    ),

    // Funnel data: pull last-30d signups + the userIds that have optimized + the
    // userIds that have purchased. Compute the cohort table in JS (no $queryRaw,
    // no BigInt serialization risk).
    safe(
      prisma.user.findMany({
        where: { createdAt: { gte: d30 } },
        select: { id: true, createdAt: true },
      }),
      [] as Array<{ id: string; createdAt: Date }>,
      "cohortUsers"
    ),
    safe(
      prisma.optimizationLog
        .findMany({ select: { userId: true }, distinct: ["userId"] })
        .then((rows) => new Set(rows.map((r) => r.userId))),
      new Set<string>(),
      "cohortOptUserIds"
    ),
    safe(
      prisma.purchase
        .findMany({ select: { userId: true }, distinct: ["userId"] })
        .then((rows) => new Set(rows.map((r) => r.userId))),
      new Set<string>(),
      "cohortPurchaseUserIds"
    ),
  ]);

  const revenueToday = Number(revenueAggToday._sum.amount ?? 0);
  const revenue7d = Number(revenueAgg7d._sum.amount ?? 0);
  const revenue30d = Number(revenueAgg30d._sum.amount ?? 0);
  const revenueAll = Number(revenueAggAll._sum.amount ?? 0);

  // Group cohortUsers by signup day, then compute optimized/purchased counts
  // by checking each user against the two Sets above. Pure JS, no DB hop.
  const byDay = new Map<
    string,
    { signups: number; optimized: number; purchased: number }
  >();
  for (const u of cohortUsers) {
    const day = new Date(u.createdAt);
    day.setUTCHours(0, 0, 0, 0);
    const key = day.toISOString().slice(0, 10);
    const row = byDay.get(key) ?? { signups: 0, optimized: 0, purchased: 0 };
    row.signups += 1;
    if (cohortOptUserIds.has(u.id)) row.optimized += 1;
    if (cohortPurchaseUserIds.has(u.id)) row.purchased += 1;
    byDay.set(key, row);
  }

  const funnelRows = Array.from(byDay.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, r]) => ({
      day: new Date(key).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      signups: r.signups,
      optimized: r.optimized,
      purchased: r.purchased,
    }));

  const totals = {
    signups: funnelRows.reduce((s, r) => s + r.signups, 0),
    optimized: funnelRows.reduce((s, r) => s + r.optimized, 0),
    purchased: funnelRows.reduce((s, r) => s + r.purchased, 0),
  };
  const conv30d = {
    optimizeRate: totals.signups ? (totals.optimized / totals.signups) * 100 : 0,
    purchaseRate: totals.signups ? (totals.purchased / totals.signups) * 100 : 0,
    optimizeToPurchase: totals.optimized
      ? (totals.purchased / totals.optimized) * 100
      : 0,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Admin dashboard</h1>
            <p className="text-slate-500 text-sm">hired-cv.com — owner only</p>
          </div>
          <div className="flex gap-2 text-sm">
            <Link
              href="/admin/feedback"
              className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              Feedback →
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* KPI rows */}
        <KpiRow
          icon={<Users className="w-5 h-5" />}
          color="indigo"
          label="Signups"
          today={signupsToday}
          d7={signups7d}
          d30={signups30d}
          all={signupsAll}
        />
        <KpiRow
          icon={<Sparkles className="w-5 h-5" />}
          color="amber"
          label="Optimizations"
          today={optsToday}
          d7={opts7d}
          d30={opts30d}
          all={optsAll}
        />
        <KpiRow
          icon={<CreditCard className="w-5 h-5" />}
          color="emerald"
          label="Purchases"
          today={purchasesToday}
          d7={purchases7d}
          d30={purchases30d}
          all={purchasesAll}
        />
        <KpiRow
          icon={<DollarSign className="w-5 h-5" />}
          color="blue"
          label="Revenue"
          today={fmtMoney(revenueToday)}
          d7={fmtMoney(revenue7d)}
          d30={fmtMoney(revenue30d)}
          all={fmtMoney(revenueAll)}
        />

        {/* 30d funnel */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                30-day signup cohort funnel
              </h2>
              <p className="text-sm text-slate-500">
                Each row is the day users signed up — then we see who later optimized and who later purchased.
              </p>
            </div>
            <div className="flex gap-4 text-sm">
              <Stat label="signup → optimize" value={`${conv30d.optimizeRate.toFixed(1)}%`} />
              <Stat label="signup → purchase" value={`${conv30d.purchaseRate.toFixed(1)}%`} />
              <Stat label="optimize → purchase" value={`${conv30d.optimizeToPurchase.toFixed(1)}%`} />
            </div>
          </div>
          <div className="overflow-x-auto -mx-6">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 border-y border-slate-100">
                <tr>
                  <th className="px-6 py-2 font-medium">Cohort day</th>
                  <th className="px-4 py-2 font-medium text-right">Signups</th>
                  <th className="px-4 py-2 font-medium text-right">Optimized</th>
                  <th className="px-4 py-2 font-medium text-right">Purchased</th>
                  <th className="px-6 py-2 font-medium text-right">Sign→Pay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {funnelRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-6 text-center text-slate-400">
                      No data in the last 30 days.
                    </td>
                  </tr>
                ) : (
                  funnelRows.map((r) => (
                    <tr key={r.day}>
                      <td className="px-6 py-2 text-slate-700">{r.day}</td>
                      <td className="px-4 py-2 text-right text-slate-900 font-medium">
                        {r.signups}
                      </td>
                      <td className="px-4 py-2 text-right text-slate-700">{r.optimized}</td>
                      <td className="px-4 py-2 text-right text-emerald-700 font-medium">
                        {r.purchased}
                      </td>
                      <td className="px-6 py-2 text-right text-slate-500">
                        {r.signups
                          ? `${((r.purchased / r.signups) * 100).toFixed(1)}%`
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Latest signups + purchases */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Panel title="Latest signups" subtitle="Most recent 20 users">
            {recentUsers.length === 0 ? (
              <EmptyState text="No users yet." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentUsers.map((u) => (
                  <li key={u.id} className="px-6 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-900 truncate">{u.email}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {fmtDate(u.createdAt)}
                        <span>· {u.credits} credits</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Latest purchases" subtitle="Most recent 20 paid orders">
            {recentPurchases.length === 0 ? (
              <EmptyState text="No purchases yet." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {recentPurchases.map((p) => (
                  <li key={p.id} className="px-6 py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-slate-900 truncate">
                        {p.user?.email ?? "unknown"} — {p.plan}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {fmtDate(p.createdAt)}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-slate-900 shrink-0">
                      {fmtMoney(Number(p.amount))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {/* Latest optimizations */}
        <Panel title="Latest optimizations" subtitle="Most recent 20 resume optimizations">
          {recentOpts.length === 0 ? (
            <EmptyState text="No optimizations logged yet. They'll appear here as soon as users run an analyze." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-2 font-medium">User</th>
                    <th className="px-4 py-2 font-medium">Target role</th>
                    <th className="px-4 py-2 font-medium">Company</th>
                    <th className="px-4 py-2 font-medium text-right">Score</th>
                    <th className="px-6 py-2 font-medium text-right">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOpts.map((o) => (
                    <tr key={o.id}>
                      <td className="px-6 py-2 text-slate-900">{o.userEmail}</td>
                      <td className="px-4 py-2 text-slate-700">{o.jobTitle ?? "—"}</td>
                      <td className="px-4 py-2 text-slate-500">{o.companyName ?? "—"}</td>
                      <td className="px-4 py-2 text-right text-slate-900 font-medium">
                        {typeof o.matchScore === "number" ? `${o.matchScore}/100` : "—"}
                      </td>
                      <td className="px-6 py-2 text-right text-slate-500">
                        {fmtDate(o.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <footer className="text-xs text-slate-400 text-center pt-4">
          KPIs computed from Prisma · Auto-refresh on reload · UTC day buckets
        </footer>
      </main>
    </div>
  );
}

function KpiRow({
  icon,
  color,
  label,
  today,
  d7,
  d30,
  all,
}: {
  icon: React.ReactNode;
  color: "indigo" | "amber" | "emerald" | "blue";
  label: string;
  today: number | string;
  d7: number | string;
  d30: number | string;
  all: number | string;
}) {
  const colorMap = {
    indigo: "bg-indigo-100 text-indigo-600",
    amber: "bg-amber-100 text-amber-600",
    emerald: "bg-emerald-100 text-emerald-600",
    blue: "bg-blue-100 text-blue-600",
  } as const;

  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
        <h2 className="text-lg font-semibold text-slate-900">{label}</h2>
        <TrendingUp className="w-4 h-4 text-slate-300 ml-auto" />
      </div>
      <div className="grid grid-cols-4 gap-3">
        <KpiCell label="Today" value={today} />
        <KpiCell label="7 days" value={d7} />
        <KpiCell label="30 days" value={d30} />
        <KpiCell label="All time" value={all} />
      </div>
    </section>
  );
}

function KpiCell({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 p-4">
      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">
        {label}
      </div>
      <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">{value}</div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="p-10 text-center text-slate-400 text-sm flex flex-col items-center gap-2">
      <ArrowRight className="w-4 h-4 text-slate-300" />
      {text}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-right">
      <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
      <div className="text-base font-semibold text-slate-900 tabular-nums">{value}</div>
    </div>
  );
}

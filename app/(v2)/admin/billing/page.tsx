import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAdminUser } from "@/lib/admin";
import { billingOverview } from "@/lib/billing/admin";
import { ledgerLabel } from "@/lib/billing/labels";
import { Badge, Card, CardHeader } from "@/components/ui";
import { AppHeader } from "@/components/v2/AppHeader";

export const metadata: Metadata = { title: "Billing · Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const when = (d: Date) => d.toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-5">
      <p className="text-dense font-medium text-ink-2">{label}</p>
      <p className="mt-1 text-h2 font-semibold tabular text-ink">{value}</p>
    </Card>
  );
}

export default async function AdminBillingPage() {
  if (!(await getAdminUser().catch(() => null))) notFound();
  const o = await billingOverview();
  const cell = "py-2.5 px-5";

  return (
    <div className="min-h-dvh bg-canvas">
      <AppHeader />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 md:px-8">
        <h1 className="text-h1 font-semibold text-ink">Billing</h1>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Revenue, 30 days" value={`$${o.revenue30.toFixed(2)}`} />
          <Stat label="Orders, 30 days" value={String(o.orders30)} />
          <Stat label="Credits outstanding" value={String(o.outstanding)} />
          <Stat label="Unlimited now" value={String(o.unlimited)} />
        </div>

        <Card>
          <CardHeader title="Ledger integrity" action={o.drift.length === 0 ? <Badge tone="success">OK</Badge> : <Badge tone="danger">{o.drift.length} off</Badge>} />
          {o.drift.length > 0 && (
            <table className="w-full text-body">
              <tbody>
                {o.drift.map((d) => (
                  <tr key={d.id} className="border-b border-hairline last:border-0">
                    <td className={cell}>{d.email}</td>
                    <td className={`${cell} text-end tabular`}>balance {d.credits}</td>
                    <td className={`${cell} text-end tabular text-danger`}>ledger {d.ledger}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <CardHeader title="Webhook deliveries not processed" action={o.stuck.length === 0 ? <Badge tone="success">None</Badge> : <Badge tone="warn">{o.stuck.length}</Badge>} />
          {o.stuck.length > 0 && (
            <table className="w-full text-body">
              <tbody>
                {o.stuck.map((e) => (
                  <tr key={e.id} className="border-b border-hairline last:border-0">
                    <td className={`${cell} font-mono text-dense`}>{e.id}</td>
                    <td className={cell}>{e.type}</td>
                    <td className={`${cell} text-end text-ink-2`}>{when(e.receivedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_2fr]">
          <Card>
            <CardHeader title="Last 7 days" />
            <table className="w-full text-body">
              <tbody>
                {o.spend.map((s) => (
                  <tr key={s.reason} className="border-b border-hairline last:border-0">
                    <td className={cell}>{ledgerLabel(s.reason)}</td>
                    <td className={`${cell} text-end tabular text-ink-2`}>{s._count}×</td>
                    <td className={`${cell} text-end tabular`}>{(s._sum.delta ?? 0) > 0 ? `+${s._sum.delta}` : s._sum.delta}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <Card className="overflow-hidden">
            <CardHeader title="Recent activity" />
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[560px] text-body">
                <tbody>
                  {o.recent.map((r) => (
                    <tr key={r.id} className="border-b border-hairline last:border-0">
                      <td className={`${cell} text-ink-2`}>{when(r.createdAt)}</td>
                      <td className={`${cell} truncate`}>{r.user.email}</td>
                      <td className={cell}>{ledgerLabel(r.reason)}</td>
                      <td className={`${cell} text-end tabular`}>{r.delta > 0 ? `+${r.delta}` : r.delta}</td>
                      <td className={`${cell} text-end tabular text-ink-2`}>{r.balanceAfter}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}

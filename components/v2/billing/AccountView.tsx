"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Check, ExternalLink, Gift, Infinity as InfinityIcon, Loader2, Plus, Receipt } from "lucide-react";
import { ledgerLabel } from "@/lib/billing/labels";
import { firePurchaseConversion } from "@/lib/purchaseTracking";
import { POLAR_PLANS, planGrantsUnlimited, type PolarPlanKey } from "@/lib/polar";
import { Badge, Button, Card, cn, EmptyState, ErrorState, Input, toast } from "@/components/ui";

export type AccountData = {
  balance: { credits: number; unlimited: boolean; plan: string | null; periodEnd: string | null; status: string | null };
  ledger: { id: string; delta: number; balanceAfter: number; reason: string; refType: string | null; refId: string | null; createdAt: string }[];
  purchases: { id: string; plan: string; amount: number; status: string; createdAt: string; polarOrderId: string | null }[];
};

const day = (iso: string) => new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
const dateTime = (iso: string) => new Date(iso).toLocaleString("en", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

async function fetchAccount(): Promise<AccountData | null> {
  const r = await fetch("/api/billing/me", { cache: "no-store" });
  return r.ok ? r.json() : null;
}

/** After Polar redirects back: wait for the webhook to land, then say what changed. */
function useCheckoutReturn(initial: AccountData, setData: (d: AccountData) => void) {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useUser();
  const checkoutId = params.get("checkout_id") ?? undefined;
  const plan = params.get("plan");
  const [state, setState] = React.useState<"idle" | "waiting" | "done" | "slow">(checkoutId ? "waiting" : "idle");
  const startCount = React.useRef(initial.purchases.length);
  const startUnlimited = React.useRef(initial.balance.unlimited);

  React.useEffect(() => {
    if (!checkoutId) return;
    firePurchaseConversion(plan, checkoutId, user?.primaryEmailAddress?.emailAddress);
  }, [checkoutId, plan, user]);

  React.useEffect(() => {
    if (!checkoutId) return;
    let stop = false;
    const cfg = plan && plan in POLAR_PLANS ? POLAR_PLANS[plan as PolarPlanKey] : null;
    const grantsUnlimited = cfg ? planGrantsUnlimited(cfg) : false;
    (async () => {
      for (let i = 0; i < 20 && !stop; i++) {
        const d = await fetchAccount().catch(() => null);
        if (d) {
          setData(d);
          const landed = d.purchases.length > startCount.current || (grantsUnlimited && d.balance.unlimited && !startUnlimited.current);
          if (landed) {
            setState("done");
            // Drop the checkout params so a refresh doesn't re-run this.
            router.replace("/account", { scroll: false });
            return;
          }
        }
        await new Promise((r) => setTimeout(r, i < 5 ? 1500 : 3000));
      }
      if (!stop) setState("slow");
    })();
    return () => {
      stop = true;
    };
  }, [checkoutId, plan, router, setData]);

  const cfg = plan && plan in POLAR_PLANS ? POLAR_PLANS[plan as PolarPlanKey] : null;
  return { state, plan: cfg };
}

function Redeem({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Gift /> Redeem a code
      </Button>
    );
  }
  return (
    <form
      className="flex w-full flex-col gap-2 sm:w-auto"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          const r = await fetch("/api/redeem-coupon", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: code.trim() }) });
          const body = await r.json().catch(() => null);
          if (!r.ok) throw new Error(body?.error ?? "That code didn't work");
          toast.success(`Added ${body?.creditsAdded ?? ""} credits`.replace("  ", " "));
          setOpen(false);
          setCode("");
          onDone();
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="flex items-center gap-2">
        <label htmlFor="coupon" className="sr-only">
          Code
        </label>
        <Input id="coupon" autoFocus value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code" className="w-44" aria-invalid={!!error} maxLength={40} />
        <Button type="submit" size="sm" loading={busy} disabled={!code.trim()}>
          Redeem
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-dense text-danger">
          {error}
        </p>
      )}
    </form>
  );
}

export function AccountView({ initial, portalUnavailable }: { initial: AccountData; portalUnavailable?: boolean }) {
  const [data, setData] = React.useState(initial);
  const refresh = React.useCallback(async () => {
    const d = await fetchAccount().catch(() => null);
    if (d) setData(d);
  }, []);
  const checkout = useCheckoutReturn(initial, setData);
  const { balance, ledger, purchases } = data;
  const planName = (refId: string | null) => purchases.find((p) => p.polarOrderId === refId)?.plan;
  const unlimitedPlan = balance.plan && balance.plan in POLAR_PLANS ? POLAR_PLANS[balance.plan as PolarPlanKey] : null;
  const renews = balance.status === "active" && unlimitedPlan?.kind === "subscription";

  return (
    <div className="flex flex-col gap-6">
      {checkout.state !== "idle" && (
        <div
          role="status"
          className={cn(
            "flex items-center gap-3 rounded-card border px-4 py-3 text-body",
            checkout.state === "done" ? "border-success/25 bg-success-wash text-success" : "border-hairline bg-surface text-ink",
          )}
        >
          {checkout.state === "done" ? <Check className="size-4 shrink-0" /> : <Loader2 className="size-4 shrink-0 animate-spin text-ink-3" />}
          <span className="font-medium">
            {checkout.state === "done"
              ? checkout.plan && planGrantsUnlimited(checkout.plan)
                ? "Unlimited is on"
                : `Added ${checkout.plan?.credits ?? ""} credits`.replace("  ", " ")
              : checkout.state === "slow"
                ? "Payment received. Your credits can take a minute to appear."
                : "Payment received. Adding it to your account…"}
          </span>
          {checkout.state === "slow" && (
            <Button size="sm" variant="ghost" className="ms-auto" onClick={() => void refresh()}>
              Refresh
            </Button>
          )}
        </div>
      )}

      {portalUnavailable && <ErrorState title="Billing management isn't available right now." />}

      <Card className="flex flex-col gap-5 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
        <div className="min-w-0">
          {balance.unlimited ? (
            <>
              <p className="flex items-center gap-2 text-h1 font-semibold text-ink">
                <InfinityIcon className="size-7 text-accent" aria-hidden /> Unlimited
              </p>
              <p className="mt-1 text-body text-ink-2">
                {unlimitedPlan?.kind === "subscription" ? "Monthly" : unlimitedPlan?.name ?? "Active"}
                {balance.periodEnd && ` · ${renews ? "renews" : "until"} ${day(balance.periodEnd)}`}
                {balance.credits > 0 && ` · ${balance.credits} credits kept for later`}
              </p>
            </>
          ) : (
            <>
              <p className="text-display font-semibold tabular leading-none text-ink">{balance.credits}</p>
              <p className="mt-2 text-body text-ink-2">{balance.credits === 1 ? "credit" : "credits"}</p>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Redeem onDone={() => void refresh()} />
          {(balance.unlimited || purchases.length > 0) && (
            <Button asChild variant="secondary" size="sm">
              <a href="/api/billing/portal">
                <Receipt /> Billing <ExternalLink className="!size-3.5 text-ink-3" />
              </a>
            </Button>
          )}
          {!balance.unlimited && (
            <Button asChild variant="primary">
              <Link href="/pricing">
                <Plus /> Add credits
              </Link>
            </Button>
          )}
        </div>
      </Card>

      <section aria-labelledby="activity">
        <h2 id="activity" className="mb-3 text-h3 font-semibold text-ink">
          Activity
        </h2>
        {ledger.length === 0 ? (
          <Card>
            <EmptyState icon={<Receipt />} title="No activity yet" />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-body">
              <thead className="sr-only">
                <tr>
                  <th>What</th>
                  <th>When</th>
                  <th>Change</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledger.map((row) => (
                  <tr key={row.id} className="border-b border-hairline last:border-0">
                    <td className="py-3 ps-4 sm:ps-5">
                      <span className="block font-medium text-ink">{ledgerLabel(row.reason, planName(row.refId))}</span>
                      <span className="block text-dense text-ink-2 sm:hidden">{dateTime(row.createdAt)}</span>
                    </td>
                    <td className="hidden py-3 text-ink-2 sm:table-cell">{dateTime(row.createdAt)}</td>
                    <td className="py-3 text-end tabular">
                      {row.delta === 0 ? (
                        <Badge tone="accent">Unlimited</Badge>
                      ) : (
                        <span className={row.delta > 0 ? "font-medium text-success" : "text-ink"}>
                          {row.delta > 0 ? `+${row.delta}` : `−${Math.abs(row.delta)}`}
                        </span>
                      )}
                    </td>
                    <td className="w-20 py-3 pe-4 text-end tabular text-ink-2 sm:pe-5">{row.balanceAfter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </section>
    </div>
  );
}

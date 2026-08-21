"use client";

// Weighted decision matrix for offer comparison.

import { useT } from "@/lib/i18n/LanguageProvider";

export type MatrixRow = { factor: string; weight: number; a: number; b: number; edge: "A" | "B" | "tie" };

export function OfferMatrix({ rows }: { rows: MatrixRow[] }) {
  const { t } = useT();
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const totalA = rows.reduce((sum, r) => sum + r.a * r.weight, 0) / 100;
  const totalB = rows.reduce((sum, r) => sum + r.b * r.weight, 0) / 100;

  return (
    <div className="rounded-lg border border-stone-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-stone-50 text-stone-500">
            <th className="text-left font-medium px-3 py-2">{t("Factor")}</th>
            <th className="text-right font-medium px-2 py-2">%</th>
            <th className="text-right font-medium px-2 py-2">A</th>
            <th className="text-right font-medium px-2 py-2">B</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map((r, i) => (
            <tr key={i}>
              <td className="px-3 py-2 text-stone-700">{r.factor}</td>
              <td className="px-2 py-2 text-right tabular-nums text-stone-400">{r.weight}</td>
              <td className={`px-2 py-2 text-right tabular-nums ${r.edge === "A" ? "font-bold text-emerald-600" : "text-stone-600"}`}>
                {r.a}
              </td>
              <td className={`px-2 py-2 text-right tabular-nums ${r.edge === "B" ? "font-bold text-emerald-600" : "text-stone-600"}`}>
                {r.b}
              </td>
            </tr>
          ))}
          <tr className="bg-stone-50 font-semibold">
            <td className="px-3 py-2 text-brand-navy">{t("Weighted total")}</td>
            <td />
            <td className={`px-2 py-2 text-right tabular-nums ${totalA >= totalB ? "text-emerald-600" : "text-stone-600"}`}>
              {totalA.toFixed(1)}
            </td>
            <td className={`px-2 py-2 text-right tabular-nums ${totalB > totalA ? "text-emerald-600" : "text-stone-600"}`}>
              {totalB.toFixed(1)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

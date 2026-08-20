"use client";

// Keyword coverage chips — present / missing (∪ missingKeySkills, deduped) /
// added-by-fixes. Computed on every analysis, rendered for the first time.

import { useT } from "@/lib/i18n/LanguageProvider";

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
}

export function KeywordChips({
  present,
  missing,
  missingKeySkills,
  added,
}: {
  present: string[];
  missing: string[];
  missingKeySkills: string[];
  added: string[];
}) {
  const { t } = useT();
  const presentSet = new Set(present.map((k) => k.trim().toLowerCase()));
  const missingAll = dedupe([...missing, ...missingKeySkills]).filter(
    (k) => !presentSet.has(k.toLowerCase())
  );
  const rows: Array<{ label: string; items: string[]; cls: string }> = [
    { label: t("In your CV"), items: dedupe(present), cls: "bg-stone-100 text-stone-600" },
    { label: t("Missing"), items: missingAll, cls: "border border-red-200 text-red-600 bg-red-50/50" },
    { label: t("Added by fixes"), items: dedupe(added), cls: "bg-brand-gold/10 text-[#8a6608]" },
  ];
  if (rows.every((r) => r.items.length === 0)) return null;

  return (
    <div className="rounded-xl border border-stone-200 px-3.5 py-3 space-y-2.5">
      {rows.map(
        ({ label, items, cls }) =>
          items.length > 0 && (
            <div key={label}>
              <div className="text-sm font-semibold text-brand-navy mb-1.5">{label}</div>
              <div className="flex flex-wrap gap-1.5">
                {items.map((k) => (
                  <span key={k} className={`px-2 py-0.5 rounded-full text-sm ${cls}`}>
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )
      )}
    </div>
  );
}

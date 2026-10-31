import Link from "next/link";
import { getServerT } from "@/lib/i18n/server";

const LINKS = [
  { href: "/pricing", label: "Pricing" },
  { href: "/resume-examples", label: "Examples" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
  { href: "/refund-policy", label: "Refunds" },
  { href: "/contact", label: "Contact" },
];

/** Footer for the marketing pages. Legacy pages keep components/shared/SiteFooter. */
export async function SiteFooter() {
  const { t, dir } = await getServerT();
  return (
    <footer dir={dir} className="border-t border-hairline bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between md:px-8">
        <span className="text-body text-ink-2">© {new Date().getFullYear()} Hired</span>
        <nav aria-label={t("Sections")} className="-mx-2 flex flex-wrap">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="inline-flex min-h-11 items-center rounded-control px-2 text-body text-ink-2 hover:text-ink sm:min-h-9">
              {t(l.label)}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}

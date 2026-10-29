import Link from "next/link";
import { ThemeToggle } from "@/components/ui";
import { AccountNav } from "./AccountNav";

/** Top bar for the v2 pages outside the editor (CV list, Start). */
export function AppHeader({ children }: { children?: React.ReactNode }) {
  return (
    <header className="border-b border-hairline bg-surface">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 md:px-8">
        <Link href="/cv" className="flex items-center gap-2.5 rounded-control">
          <span className="grid size-7 place-items-center rounded-control bg-ink text-dense font-semibold text-canvas">H</span>
          <span className="text-emph font-semibold text-ink">Hired</span>
        </Link>
        <div className="flex items-center gap-1">
          {children}
          <AccountNav />
          <div className="hidden sm:block">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { useT } from "@/lib/i18n/LanguageProvider";
import { buttonVariants, cn } from "@/components/ui";

const item = "inline-flex h-9 touch:h-11 items-center rounded-control px-3 text-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink";

/** Account link + avatar when signed in, Sign in when not. */
export function AccountNav() {
  const { t } = useT();
  return (
    <>
      <SignedIn>
        <Link href="/account" className={item}>
          {t("Account")}
        </Link>
        <span className="grid size-9 place-items-center">
          <UserButton appearance={{ elements: { avatarBox: "size-7" } }} />
        </span>
      </SignedIn>
      <SignedOut>
        {/* A real control, not a text link: it's the way back into saved work. */}
        <Link href="/sign-in" className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "me-1")}>
          {t("Sign in")}
        </Link>
      </SignedOut>
    </>
  );
}

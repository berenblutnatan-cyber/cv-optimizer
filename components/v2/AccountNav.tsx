"use client";

import Link from "next/link";
import { SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

const item = "inline-flex h-9 items-center rounded-control px-3 text-body font-medium text-ink-2 hover:bg-surface-2 hover:text-ink";

/** Account link + avatar when signed in, Sign in when not. */
export function AccountNav() {
  return (
    <>
      <SignedIn>
        <Link href="/account" className={item}>
          Account
        </Link>
        <span className="grid size-9 place-items-center">
          <UserButton appearance={{ elements: { avatarBox: "size-7" } }} />
        </span>
      </SignedIn>
      <SignedOut>
        <Link href="/sign-in" className={item}>
          Sign in
        </Link>
      </SignedOut>
    </>
  );
}

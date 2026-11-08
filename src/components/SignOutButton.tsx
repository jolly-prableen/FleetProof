"use client";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: "/login" })} className="text-sm font-semibold text-ink-soft underline-offset-4 hover:underline">
      Sign out
    </button>
  );
}

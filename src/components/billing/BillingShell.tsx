import { SignOutButton } from "@/components/SignOutButton";
import { BillingNav } from "./BillingNav";
import { BrandMark } from "@/components/BrandMark";

export function BillingShell({ userName, children }: { userName: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh max-w-6xl px-5 pb-16 pt-5 sm:px-8 sm:pt-8">
      <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-white px-4 py-3 shadow-sm sm:px-5">
        <BrandMark />
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full bg-wash px-3 py-1.5 text-sm text-ink-soft sm:inline">{userName}</span>
          <SignOutButton />
        </div>
      </header>
      <div className="mt-5"><BillingNav /></div>
      <main className="mt-8">{children}</main>
    </div>
  );
}

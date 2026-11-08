"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/billing", label: "Overview" },
  { href: "/billing/review", label: "Review" },
  { href: "/billing/queue", label: "Billing queue" },
  { href: "/billing/dashboard", label: "Missing PODs" },
  { href: "/billing/import", label: "Import trips" },
];

export function BillingNav() {
  const path = usePathname();
  return (
    <nav aria-label="Billing" className="flex gap-1 overflow-x-auto">
      {LINKS.map((l) => {
        const active = l.href === "/billing" ? path === l.href : path.startsWith(l.href) || (l.href === "/billing/queue" && path.startsWith("/billing/invoices"));
        return (
          <Link
            key={l.href} href={l.href} aria-current={active ? "page" : undefined}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold ${active ? "bg-brand text-white" : "text-ink-soft hover:bg-wash"}`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

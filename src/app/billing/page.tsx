import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { BillingShell } from "@/components/billing/BillingShell";

export const dynamic = "force-dynamic";

export default async function BillingHome() {
  const user = await requireRole("BILLING");
  const grouped = await db.trip.groupBy({ by: ["podStatus"], _count: true });
  const count = (s: string) => grouped.find((g) => g.podStatus === s)?._count ?? 0;

  const cards = [
    { label: "Waiting for POD", n: count("PENDING"), cls: "text-ink", href: "/billing/dashboard" },
    { label: "Needs review", n: count("NEEDS_REVIEW"), cls: "text-review", href: "/billing/review" },
    { label: "Retake requested", n: count("RETAKE_REQUESTED"), cls: "text-warn", href: "/billing/dashboard" },
    { label: "Verified, ready to bill", n: count("VERIFIED"), cls: "text-ok", href: "/billing/queue" },
  ];

  return (
    <BillingShell userName={user.name ?? ""}>
      <div className="mb-7">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Operations overview</p>
        <h2 className="mt-1 text-3xl font-bold tracking-tight">Keep deliveries moving</h2>
        <p className="mt-1 max-w-xl text-ink-soft">A quick view of what needs attention before trips can be billed.</p>
      </div>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => {
          const inner = (
            <>
              <p className={`text-4xl font-bold ${c.cls}`}>{c.n}</p>
              <p className="mt-1 text-sm text-ink-soft">{c.label}</p>
            </>
          );
          return (
            <li key={c.label}>
              {c.href ? (
                <Link href={c.href} className="group block rounded-xl2 border border-line bg-paper p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md">{inner}<span className="mt-4 block text-xs font-semibold text-brand opacity-0 transition-opacity group-hover:opacity-100">Open →</span></Link>
              ) : (
                <div className="rounded-xl2 border border-line p-5">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </BillingShell>
  );
}

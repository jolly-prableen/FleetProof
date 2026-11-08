import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { BillingShell } from "@/components/billing/BillingShell";
import { CreateInvoiceButton } from "@/components/billing/CreateInvoiceButton";
import { invoiceNo } from "@/lib/export";
import { dateTime, inr } from "@/lib/format";
import { SendUploadLinkButton } from "@/components/billing/SendUploadLinkButton";

export const dynamic = "force-dynamic";

export default async function QueuePage() {
  const user = await requireRole("BILLING");
  const [trips, invoices] = await Promise.all([
    db.trip.findMany({ where: { podStatus: "VERIFIED", invoiceId: null }, orderBy: [{ clientCycle: "asc" }, { id: "asc" }] }),
    db.invoice.findMany({ orderBy: { number: "desc" }, take: 8, include: { trips: { select: { freight: true } } } }),
  ]);

  const groups = new Map<string, typeof trips>();
  for (const t of trips) {
    const k = `${t.client}|${t.clientCycle}`;
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }

  return (
    <BillingShell userName={user.name ?? ""}>
      <h2 className="text-2xl font-bold">Billing queue</h2>
      <p className="mt-1 text-ink-soft">Trips with a verified POD, by client and cycle. You create each invoice yourself. Nothing is sent to the client.</p>

      {groups.size === 0 ? (
        <p className="mt-8 rounded-xl2 bg-wash p-8 text-center text-ink-soft">No verified trips are waiting. Approved PODs will appear here.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {[...groups.entries()].map(([k, ts]) => {
            const [client, cycle] = k.split("|");
            const total = ts.reduce((a, t) => a + t.freight, 0);
            return (
              <li key={k} className="rounded-xl2 border border-line p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold">{client}</p>
                    <p className="text-sm text-ink-soft">Cycle {cycle} · {ts.length} trip{ts.length > 1 ? "s" : ""}</p>
                    <p className="mt-2 text-2xl font-bold">{inr(total)}</p>
                  </div>
                  <CreateInvoiceButton client={client} cycle={cycle} />
                </div>
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-semibold text-ink-soft">Show trips</summary>
                  <ul className="mt-2 divide-y divide-line text-sm">
                    {ts.map((t) => (
                      <li key={t.id} className="flex justify-between gap-3 py-2">
                        <span>{t.id} · {t.destination} · {t.lrNumber}</span>
                        <span className="flex items-center gap-3"><span className="font-semibold">{inr(t.freight)}</span>{t.hired && <SendUploadLinkButton tripId={t.id} />}</span>
                      </li>
                    ))}
                  </ul>
                </details>
              </li>
            );
          })}
        </ul>
      )}

      <h3 className="mt-12 text-lg font-semibold">Recent invoices</h3>
      {invoices.length === 0 ? (
        <p className="mt-3 text-ink-soft">No invoices yet.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line rounded-xl2 border border-line">
          {invoices.map((i) => (
            <li key={i.id}>
              <Link href={`/billing/invoices/${i.id}`} className="flex flex-wrap items-center justify-between gap-2 p-4 hover:bg-wash">
                <span>
                  <span className="font-semibold">{invoiceNo(i.number)}</span>
                  <span className="text-ink-soft"> · {i.client} · {i.cycle}</span>
                </span>
                <span className="text-sm text-ink-soft">
                  {inr(i.trips.reduce((a, t) => a + t.freight, 0))} · {i.exportedAt ? `Exported ${dateTime(i.exportedAt)}` : "Not exported"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </BillingShell>
  );
}

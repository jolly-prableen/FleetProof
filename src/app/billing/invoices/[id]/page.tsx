import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { BillingShell } from "@/components/billing/BillingShell";
import { invoiceNo } from "@/lib/export";
import { dateTime, inr } from "@/lib/format";
import { ShareInvoiceButton } from "@/components/billing/ShareInvoiceButton";

export const dynamic = "force-dynamic";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole("BILLING");
  const { id } = await params;
  const inv = await db.invoice.findUnique({
    where: { id },
    include: { trips: { orderBy: { id: "asc" }, include: { pods: { orderBy: { uploadedAt: "desc" }, take: 1, select: { id: true } } } } },
  });
  if (!inv) notFound();
  const total = inv.trips.reduce((a, t) => a + t.freight, 0);

  return (
    <BillingShell userName={user.name ?? ""}>
      <Link href="/billing/queue" className="text-sm font-semibold text-ink-soft">Back to billing queue</Link>
      <h2 className="mt-3 text-2xl font-bold">{invoiceNo(inv.number)}</h2>
      <p className="text-ink-soft">{inv.client} · Cycle {inv.cycle} · {inv.trips.length} trips · {inr(total)}</p>

      <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <a href={`/api/invoices/${inv.id}/export?format=tally`} className="rounded-lg bg-brand px-5 py-3 text-center font-semibold text-white hover:bg-brand-dark">Download for Tally (XML)</a>
        <a href={`/api/invoices/${inv.id}/export?format=csv`} className="rounded-lg border border-line px-5 py-3 text-center font-semibold hover:bg-wash">Download CSV</a>
        <ShareInvoiceButton invoiceId={inv.id} />
        <span className="text-sm text-ink-soft">{inv.exportedAt ? `Last exported ${dateTime(inv.exportedAt)}` : "Not exported yet"}</span>
      </div>
      <p className="mt-3 max-w-2xl text-sm text-ink-soft">
        Tally cannot take photos through an XML import, so each trip&apos;s POD link is written into the voucher narration. The photos are attached below as the invoice pack.
      </p>

      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {inv.trips.map((t) => (
          <li key={t.id} className="flex gap-4 rounded-xl2 border border-line p-4">
            {t.pods[0] && (
              <a href={`/api/pods/${t.pods[0].id}/image`} target="_blank" rel="noreferrer" className="shrink-0" title="Open POD full size">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/pods/${t.pods[0].id}/image`} alt={`POD for ${t.id}`} loading="lazy" className="h-24 w-24 rounded-lg border border-line bg-wash object-cover" />
              </a>
            )}
            <div className="min-w-0 text-sm">
              <p className="font-semibold">{t.id} · {t.destination}</p>
              <p className="break-words text-ink-soft">{t.lrNumber} · EWB {t.ewayBill}</p>
              <p className="break-words text-ink-soft">{t.vehicle}</p>
              <p className="mt-1 font-semibold">{inr(t.freight)}</p>
            </div>
          </li>
        ))}
      </ul>
    </BillingShell>
  );
}

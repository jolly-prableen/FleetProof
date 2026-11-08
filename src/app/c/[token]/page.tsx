import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { invoiceNo } from "@/lib/export";
import { dateTime, inr } from "@/lib/format";
import { isShareActive } from "@/lib/shareAccess";

export const dynamic = "force-dynamic";

export default async function ClientInvoicePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invoice = await db.invoice.findFirst({
    where: { shareToken: token },
    include: { trips: { orderBy: { id: "asc" }, include: { pods: { where: { outcome: "VERIFIED" }, orderBy: { uploadedAt: "desc" }, take: 1, select: { id: true } } } } },
  });
  if (!invoice || !isShareActive(invoice.shareToken, token, invoice.shareTokenExpiresAt, invoice.shareRevokedAt)) notFound();
  return (
    <main className="mx-auto max-w-4xl px-5 py-8">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand">POD Desk</p>
      <h1 className="mt-3 text-3xl font-bold">{invoiceNo(invoice.number)}</h1>
      <p className="mt-1 break-words text-ink-soft">{invoice.client} · Cycle {invoice.cycle} · {dateTime(invoice.createdAt)}</p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2">
        {invoice.trips.map((trip) => (
          <li key={trip.id} className="rounded-xl2 border border-line p-4">
            {trip.pods[0] && <a href={`/api/client/pods/${trip.pods[0].id}/image?token=${encodeURIComponent(token)}`} target="_blank" rel="noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/client/pods/${trip.pods[0].id}/image?token=${encodeURIComponent(token)}`} alt={`POD for ${trip.id}`} className="h-52 w-full rounded-lg border border-line bg-wash object-contain" />
            </a>}
            <p className="mt-3 break-words font-semibold">{trip.id} · {trip.destination}</p>
            <p className="break-words text-sm text-ink-soft">{trip.lrNumber} · EWB {trip.ewayBill} · {trip.vehicle}</p>
            <p className="mt-1 font-semibold">{inr(trip.freight)}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}

import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { BillingShell } from "@/components/billing/BillingShell";
import { ReviewForm, type Fields } from "@/components/billing/ReviewForm";
import { StatusBadge } from "@/components/StatusBadge";
import { REASON_TEXT } from "@/lib/messages";
import type { Reason } from "@/lib/podRules";
import { dateTime, inr, maskPhone } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReviewDetail({ params }: { params: Promise<{ tripId: string }> }) {
  const user = await requireRole("BILLING");
  const { tripId } = await params;
  const trip = await db.trip.findUnique({
    where: { id: tripId },
    include: { pods: { orderBy: { uploadedAt: "desc" }, take: 1, select: { id: true, extracted: true, confidence: true, reasons: true, capturedAt: true, lat: true, lng: true, sizeKb: true } } },
  });
  const pod = trip?.pods[0];
  if (!trip || !pod) notFound();

  const ex = (pod.extracted ?? {}) as Partial<Fields> & { readable?: boolean };
  const initial: Fields = {
    lr: ex.lr ?? "", qty: ex.qty ?? "", remarks: ex.remarks ?? "", date: ex.date ?? "",
    stamp: !!ex.stamp, signature: !!ex.signature,
  };
  const reasons = pod.reasons as Reason[];
  const open = trip.podStatus === "NEEDS_REVIEW";

  return (
    <BillingShell userName={user.name ?? ""}>
      <Link href="/billing/review" className="text-sm font-semibold text-ink-soft">Back to review</Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h2 className="text-2xl font-bold">{trip.id}</h2>
        <StatusBadge status={trip.podStatus} />
      </div>
      <p className="text-ink-soft">{trip.client} to {trip.destination} · {trip.vehicle} · {inr(trip.freight)}</p>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <section aria-label="POD photo">
          <a href={`/api/pods/${pod.id}/image`} target="_blank" rel="noreferrer" title="Open full size">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/pods/${pod.id}/image`} alt={`POD photo for ${trip.id}`} className="w-full rounded-xl2 border border-line bg-wash" />
          </a>
          <p className="mt-3 text-sm text-ink-soft">
            Captured {dateTime(pod.capturedAt)}
            {pod.lat !== null && pod.lng !== null ? ` · ${pod.lat.toFixed(3)}, ${pod.lng.toFixed(3)}` : " · no GPS"} · {pod.sizeKb} KB
          </p>
        </section>

        <section aria-label="Check and decide">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-ink-soft">Trip LR number</dt><dd className="font-semibold">{trip.lrNumber}</dd>
            <dt className="text-ink-soft">E-way bill</dt><dd className="font-semibold">{trip.ewayBill}</dd>
            <dt className="text-ink-soft">Consignee</dt><dd className="font-semibold">{trip.consigneeName} · {maskPhone(trip.consigneePhone)}</dd>
            <dt className="text-ink-soft">AI confidence</dt><dd className="font-semibold">{pod.confidence === null ? "No AI result" : `${Math.round(pod.confidence * 100)}%`}</dd>
          </dl>

          {reasons.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {reasons.map((r) => <li key={r} className="rounded-full bg-review-bg px-3 py-1 text-sm font-semibold text-review">{REASON_TEXT[r] ?? r}</li>)}
            </ul>
          )}

          {open ? (
            <ReviewForm tripId={trip.id} initial={initial} />
          ) : (
            <p className="mt-6 rounded-xl2 bg-wash p-4 text-ink-soft">This POD is already {trip.podStatus.toLowerCase().replace("_", " ")}.</p>
          )}
        </section>
      </div>
    </BillingShell>
  );
}

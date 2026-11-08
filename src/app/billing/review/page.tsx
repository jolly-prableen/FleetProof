import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { BillingShell } from "@/components/billing/BillingShell";
import { REASON_TEXT } from "@/lib/messages";
import type { Reason } from "@/lib/podRules";
import { dateTime, inr } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReviewQueue() {
  const user = await requireRole("BILLING");
  const trips = await db.trip.findMany({
    where: { podStatus: "NEEDS_REVIEW" },
    orderBy: { deliveredAt: "asc" }, // oldest first: they are holding up cash the longest
    include: { pods: { orderBy: { uploadedAt: "desc" }, take: 1, select: { reasons: true, uploadedAt: true } } },
  });

  return (
    <BillingShell userName={user.name ?? ""}>
      <h2 className="text-2xl font-bold">Review</h2>
      <p className="mt-1 text-ink-soft">PODs the AI could not clear on its own. Oldest first.</p>

      {trips.length === 0 ? (
        <p className="mt-8 rounded-xl2 bg-wash p-8 text-center text-ink-soft">Nothing to review. New PODs that need a person will appear here.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line rounded-xl2 border border-line">
          {trips.map((t) => {
            const pod = t.pods[0];
            const reasons = (pod?.reasons ?? []) as Reason[];
            return (
              <li key={t.id}>
                <Link href={`/billing/review/${t.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 transition-colors hover:bg-wash">
                  <span className="min-w-0 max-w-full">
                    <span className="block break-words font-semibold">{t.client} to {t.destination}</span>
                    <span className="block break-words text-sm text-ink-soft">{t.id} · {t.vehicle} · {inr(t.freight)}</span>
                    <span className="mt-2 flex flex-wrap gap-2">
                      {reasons.length === 0 && t.remarks && <Chip text={t.remarks} />}
                      {reasons.map((r) => <Chip key={r} text={REASON_TEXT[r] ?? r} />)}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-ink-soft">{pod ? dateTime(pod.uploadedAt) : ""}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </BillingShell>
  );
}

function Chip({ text }: { text: string }) {
  return <span className="rounded-full bg-review-bg px-3 py-1 text-sm font-semibold text-review">{text}</span>;
}

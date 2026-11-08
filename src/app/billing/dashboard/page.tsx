import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { BillingShell } from "@/components/billing/BillingShell";
import { StatusBadge } from "@/components/StatusBadge";
import { daysBetween, lagByBranch, mean, missingByBranch } from "@/lib/stats";
import { inr } from "@/lib/format";
import { SendUploadLinkButton } from "@/components/billing/SendUploadLinkButton";

export const dynamic = "force-dynamic";
const TARGET_DAYS = 4;

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ branch?: string }> }) {
  const user = await requireRole("BILLING");
  const { branch } = await searchParams;
  const now = new Date();

  const [missing, invoiced, ready] = await Promise.all([
    db.trip.findMany({
      where: { podStatus: { in: ["PENDING", "RETAKE_REQUESTED", "REJECTED"] } },
      orderBy: { deliveredAt: "asc" },
      select: { id: true, client: true, destination: true, vehicle: true, branch: true, deliveredAt: true, podStatus: true, freight: true, hired: true },
    }),
    db.trip.findMany({
      where: { invoiceId: { not: null } },
      select: { branch: true, invoice: { select: { createdAt: true } }, pods: { orderBy: { capturedAt: "asc" }, take: 1, select: { capturedAt: true } } },
    }),
    db.trip.aggregate({ where: { podStatus: "VERIFIED", invoiceId: null }, _count: true, _sum: { freight: true } }),
  ]);

  const lags = invoiced.flatMap((t) => (t.invoice && t.pods[0] ? [{ branch: t.branch, lagDays: daysBetween(t.pods[0].capturedAt, t.invoice.createdAt) }] : []));
  const overall = mean(lags.map((l) => l.lagDays));
  const perBranchLag = lagByBranch(lags);
  const rows = missingByBranch(missing, now);
  const maxMissing = Math.max(1, ...rows.map((r) => r.missing));
  const over10 = missing.filter((t) => t.deliveredAt && daysBetween(t.deliveredAt, now) >= 10).length;
  const list = (branch ? missing.filter((t) => t.branch === branch) : missing).slice(0, 25);

  const kpis = [
    { label: "Trips without POD", value: String(missing.length), tone: "text-ink" },
    { label: "Waiting 10 days or more", value: String(over10), tone: over10 ? "text-warn" : "text-ok" },
    { label: `POD to invoice, average days (target ${TARGET_DAYS})`, value: overall === null ? "None yet" : String(overall), tone: overall !== null && overall > TARGET_DAYS ? "text-review" : "text-ok" },
    { label: "Verified, not yet invoiced", value: inr(ready._sum.freight ?? 0), tone: "text-ink" },
  ];

  return (
    <BillingShell userName={user.name ?? ""}>
      <h2 className="text-2xl font-bold">Missing PODs</h2>
      <p className="mt-1 text-ink-soft">Every day a POD is missing is a day the invoice cannot go out.</p>

      <ul className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <li key={k.label} className="rounded-xl2 border border-line p-5">
            <p className={`text-3xl font-bold ${k.tone}`}>{k.value}</p>
            <p className="mt-1 text-sm text-ink-soft">{k.label}</p>
          </li>
        ))}
      </ul>

      <h3 className="mt-10 text-lg font-semibold">By branch</h3>
      {rows.length === 0 ? (
        <p className="mt-3 rounded-xl2 bg-wash p-6 text-ink-soft">Every delivered trip has a POD.</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl2 border border-line">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="bg-wash text-ink-soft">
              <tr><th className="whitespace-nowrap p-3 font-semibold">Branch</th><th className="whitespace-nowrap p-3 font-semibold">Without POD</th><th className="whitespace-nowrap p-3 font-semibold">Oldest wait</th><th className="whitespace-nowrap p-3 font-semibold">POD to invoice</th></tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.branch}>
                  <td className="max-w-[12rem] break-words p-3 font-semibold"><Link href={branch === r.branch ? "/billing/dashboard" : `/billing/dashboard?branch=${encodeURIComponent(r.branch)}`} className="underline-offset-4 hover:underline">{r.branch}</Link></td>
                  <td className="p-3">
                    <span className="flex items-center gap-3">
                      <span className="w-6 font-semibold">{r.missing}</span>
                      <span className="h-2 rounded-full bg-review" style={{ width: `${(r.missing / maxMissing) * 8}rem` }} aria-hidden />
                    </span>
                  </td>
                  <td className={`p-3 ${r.oldestDays >= 10 ? "font-semibold text-warn" : ""}`}>{r.oldestDays} days</td>
                  <td className="p-3">{perBranchLag[r.branch] !== undefined ? `${perBranchLag[r.branch]} days` : "None yet"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="mt-10 flex flex-wrap items-baseline gap-3 text-lg font-semibold">
        {branch ? `Waiting in ${branch}` : "Longest waiting"}
        {branch && <Link href="/billing/dashboard" className="text-sm font-semibold text-ink-soft underline-offset-4 hover:underline">Show all branches</Link>}
      </h3>
      {list.length === 0 ? (
        <p className="mt-3 rounded-xl2 bg-wash p-6 text-ink-soft">Nothing waiting here.</p>
      ) : (
        <ul className="mt-3 divide-y divide-line rounded-xl2 border border-line">
          {list.map((t) => {
            const d = t.deliveredAt ? daysBetween(t.deliveredAt, now) : 0;
            return (
              <li key={t.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0">
                  <span className="block font-semibold">{t.id} · {t.client}</span>
                  <span className="block text-sm text-ink-soft">{t.destination} · {t.vehicle} · {t.branch} · {inr(t.freight)}</span>
                </span>
                <span className="flex flex-wrap items-center gap-3">
                  <StatusBadge status={t.podStatus} />
                  {t.hired && <SendUploadLinkButton tripId={t.id} />}
                  <span className={`w-20 text-right font-semibold ${d >= 10 ? "text-warn" : d >= 5 ? "text-review" : "text-ink-soft"}`}>{d} days</span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </BillingShell>
  );
}

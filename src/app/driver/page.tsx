import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { StatusBadge } from "@/components/StatusBadge";
import { SignOutButton } from "@/components/SignOutButton";
import { QueueSync } from "@/components/driver/QueueSync";
import { BrandMark } from "@/components/BrandMark";

export const dynamic = "force-dynamic";

export default async function DriverHome() {
  const user = await requireRole("DRIVER");
  const trips = await db.trip.findMany({
    where: { driverId: user.id },
    orderBy: { deliveredAt: "desc" },
    select: { id: true, destination: true, vehicle: true, client: true, podStatus: true, remarks: true },
    take: 20,
  });

  const todo = trips.filter((t) => t.podStatus === "PENDING" || t.podStatus === "RETAKE_REQUESTED" || t.podStatus === "REJECTED");

  return (
    <main className="mx-auto min-h-dvh max-w-md px-5 pb-16 pt-5 sm:pt-8">
      <header className="flex items-center justify-between rounded-2xl border border-line bg-white px-4 py-3 shadow-sm">
        <div>
          <BrandMark compact />
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-brand">Driver workspace</p>
          <h1 className="mt-1 text-xl font-bold tracking-tight">{user.name}</h1>
        </div>
        <SignOutButton />
      </header>

      <QueueSync />

      <section aria-labelledby="todo" className="mt-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand">Today</p>
            <h2 id="todo" className="mt-1 text-2xl font-bold tracking-tight">PODs to photograph</h2>
          </div>
          {todo.length > 0 && <span className="rounded-full bg-warn-bg px-3 py-1 text-sm font-semibold text-warn">{todo.length} waiting</span>}
        </div>
        {todo.length === 0 ? (
          <p className="mt-3 rounded-xl2 bg-wash p-6 text-ink-soft">All done. No PODs are waiting.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {todo.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/driver/capture/${t.id}`}
                  className="group flex items-center gap-4 rounded-xl2 border border-line bg-paper p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md"
                >
                  <span aria-hidden className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand text-3xl text-white shadow-sm transition-transform group-hover:scale-105">📷</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xl font-bold">{t.destination}</span>
                    <span className="block truncate text-sm text-ink-soft">{t.vehicle} · {t.id}</span>
                    {t.remarks && <span className="mt-1 block text-sm text-warn">{t.remarks}</span>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="done" className="mt-10">
        <h2 id="done" className="text-lg font-semibold">Recent trips</h2>
        <ul className="mt-3 divide-y divide-line">
          {trips.filter((t) => !todo.includes(t)).map((t) => (
            <li key={t.id} className="flex items-center justify-between py-3">
              <span>
                <span className="block font-semibold">{t.destination}</span>
                <span className="block text-sm text-ink-soft">{t.id}</span>
              </span>
              <StatusBadge status={t.podStatus} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

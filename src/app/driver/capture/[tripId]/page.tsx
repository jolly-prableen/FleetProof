import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { CaptureClient } from "@/components/driver/CaptureClient";
import { StatusBadge } from "@/components/StatusBadge";
import { toLang } from "@/lib/messages";
import { MAX_RETAKES } from "@/lib/podRules";

export const dynamic = "force-dynamic";

export default async function CapturePage({ params }: { params: Promise<{ tripId: string }> }) {
  const user = await requireRole("DRIVER");
  const { tripId } = await params;
  // Access control: a driver can only open their own trips.
  const trip = await db.trip.findFirst({ where: { id: tripId, driverId: user.id } });
  if (!trip) notFound();

  // Already with the office: nothing more for the driver to do.
  if (trip.podStatus === "VERIFIED" || trip.podStatus === "NEEDS_REVIEW") {
    return (
      <main className="mx-auto max-w-md px-5 py-6">
        <Link href="/driver" className="text-sm font-semibold text-ink-soft">Back</Link>
        <h1 className="mt-4 text-2xl font-bold">{trip.destination}</h1>
        <div className="mt-6"><StatusBadge status={trip.podStatus} /></div>
        <p className="mt-4 text-ink-soft">This POD is already submitted. Nothing more to do.</p>
      </main>
    );
  }

  return (
    <CaptureClient
      trip={{ id: trip.id, destination: trip.destination, vehicle: trip.vehicle, lrNumber: trip.lrNumber }}
      lang={toLang(user.language)}
      retakesLeft={Math.max(0, MAX_RETAKES - trip.retakeCount)}
    />
  );
}

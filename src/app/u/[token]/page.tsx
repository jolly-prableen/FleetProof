import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { CaptureClient } from "@/components/driver/CaptureClient";
import { MAX_RETAKES } from "@/lib/podRules";
import { HiredLanguagePicker } from "@/components/driver/HiredLanguagePicker";

export const dynamic = "force-dynamic";

export default async function HiredUploadPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const trip = await db.trip.findFirst({ where: { uploadToken: token, hired: true } });
  if (!trip || !trip.uploadTokenExpiresAt || trip.uploadTokenExpiresAt <= new Date()) notFound();
  if (trip.podStatus === "VERIFIED" || trip.podStatus === "NEEDS_REVIEW") {
    return <main className="mx-auto max-w-md px-5 py-12 text-center"><h1 className="text-3xl font-bold">POD already received</h1><p className="mt-4 text-ink-soft">This upload link has already been used.</p></main>;
  }
  return <HiredLanguagePicker trip={{ id: trip.id, destination: trip.destination, vehicle: trip.vehicle, lrNumber: trip.lrNumber }} token={token} retakesLeft={Math.max(0, MAX_RETAKES - trip.retakeCount)} />;
}

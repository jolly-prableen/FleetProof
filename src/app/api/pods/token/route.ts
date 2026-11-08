import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processPodUpload } from "@/lib/server/podUpload";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const throttle = rateLimit(clientKey(req, "hired-upload"), 10);
  if (!throttle.allowed) return NextResponse.json({ error: "Too many upload attempts. Try again later" }, { status: 429, headers: { "retry-after": String(throttle.retryAfter) } });
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Bad upload" }, { status: 400 }); }
  const token = form.get("token");
  if (typeof token !== "string" || token.length < 32) return NextResponse.json({ error: "Invalid upload link" }, { status: 401 });
  const tripId = form.get("tripId");
  const trip = typeof tripId === "string"
    ? await db.trip.findFirst({ where: { id: tripId, hired: true, uploadToken: token } })
    : null;
  if (!trip) return NextResponse.json({ error: "Invalid upload link" }, { status: 404 });
  if (!trip.uploadTokenExpiresAt || trip.uploadTokenExpiresAt <= new Date()) return NextResponse.json({ error: "This upload link has expired" }, { status: 410 });
  if (trip.podStatus === "VERIFIED" || trip.podStatus === "NEEDS_REVIEW") return NextResponse.json({ error: "This POD is already submitted" }, { status: 409 });
  const result = await processPodUpload(form, trip);
  return result.kind === "success" ? NextResponse.json(result.body) : NextResponse.json({ error: result.failure.message }, { status: result.failure.status });
}

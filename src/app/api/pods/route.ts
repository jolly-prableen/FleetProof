import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { processPodUpload } from "@/lib/server/podUpload";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  if (session.user.role !== "DRIVER") return NextResponse.json({ error: "Only drivers upload PODs" }, { status: 403 });
  let form: FormData;
  try { form = await req.formData(); } catch { return NextResponse.json({ error: "Bad upload" }, { status: 400 }); }
  const tripId = form.get("tripId");
  const trip = typeof tripId === "string" ? await db.trip.findFirst({ where: { id: tripId, driverId: session.user.id } }) : null;
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });
  const result = await processPodUpload(form, trip);
  return result.kind === "success" ? NextResponse.json(result.body) : NextResponse.json({ error: result.failure.message }, { status: result.failure.status });
}

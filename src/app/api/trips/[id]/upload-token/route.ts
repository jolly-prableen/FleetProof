import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  if (session.user.role !== "BILLING") return NextResponse.json({ error: "Billing access required" }, { status: 403 });
  const { id } = await params;
  const trip = await db.trip.findUnique({ where: { id } });
  if (!trip || !trip.hired) return NextResponse.json({ error: "Hired trip not found" }, { status: 404 });
  if (trip.podStatus === "VERIFIED" || trip.podStatus === "NEEDS_REVIEW") return NextResponse.json({ error: "This trip already has a submitted POD" }, { status: 409 });
  const token = crypto.randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 86_400_000);
  await db.trip.update({ where: { id }, data: { uploadToken: token, uploadTokenExpiresAt: expiresAt } });
  return NextResponse.json({ url: `/u/${token}`, expiresAt });
}

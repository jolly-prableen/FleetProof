import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  if (session.user.role !== "BILLING") return NextResponse.json({ error: "Billing access required" }, { status: 403 });
  const { id } = await params;
  const invoice = await db.invoice.findUnique({ where: { id }, select: { id: true } });
  if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  await db.invoice.update({ where: { id }, data: { shareRevokedAt: new Date() } });
  return NextResponse.json({ ok: true });
}

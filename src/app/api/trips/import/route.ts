import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { currentCycle, parseCsv, validateImportRows } from "@/lib/tripImport";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Sign in first" }, { status: 401 });
  if (session.user.role !== "BILLING") return NextResponse.json({ error: "Billing access required" }, { status: 403 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a CSV file" }, { status: 400 });
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: "CSV must be under 2 MB" }, { status: 413 });
  const parsed = parseCsv(await file.text());
  if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const checked = validateImportRows(parsed.rows);
  const ids = checked.valid.map((r) => r.id);
  const existing = await db.trip.findMany({ where: { id: { in: ids } }, select: { id: true } });
  const existingIds = new Set(existing.map((x) => x.id));
  const candidates = checked.valid.filter((r) => !existingIds.has(r.id));
  const skipped = checked.valid.length - candidates.length;
  const existingLrs = await db.trip.findMany({ where: { lrNumber: { in: candidates.map((r) => r.lrNumber) } }, select: { lrNumber: true } });
  const lrs = new Set(existingLrs.map((x) => x.lrNumber));
  const rows = candidates.filter((r) => {
    if (!lrs.has(r.lrNumber)) return true;
    checked.issues.push({ row: 0, tripId: r.id, reason: "LR number already exists" });
    return false;
  });
  if (rows.length) {
    await db.trip.createMany({
      data: rows.map((r) => ({ ...r, clientCycle: currentCycle(), podStatus: "PENDING" })),
    });
  }
  return NextResponse.json({ imported: rows.length, skipped, issues: checked.issues });
}

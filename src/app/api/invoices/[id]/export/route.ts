import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildCsv, buildTallyXml, invoiceNo, type ExportTrip } from "@/lib/export";

export const runtime = "nodejs";

const fmt = z.enum(["tally", "csv"]);

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Sign in first", { status: 401 });
  if (session.user.role !== "BILLING") return new Response("Forbidden", { status: 403 });

  const url = new URL(req.url);
  const f = fmt.safeParse(url.searchParams.get("format"));
  if (!f.success) return new Response("format must be tally or csv", { status: 400 });

  const { id } = await params;
  const inv = await db.invoice.findUnique({
    where: { id },
    include: { trips: { orderBy: { id: "asc" }, include: { pods: { orderBy: { uploadedAt: "desc" }, take: 1, select: { id: true } } } } },
  });
  if (!inv) return new Response("Not found", { status: 404 });

  const trips: ExportTrip[] = inv.trips.map((t) => ({
    id: t.id, lrNumber: t.lrNumber, ewayBill: t.ewayBill, vehicle: t.vehicle,
    destination: t.destination, freight: t.freight, podId: t.pods[0]?.id ?? null,
  }));
  // Never export a trip that has no POD: clients reject those invoices.
  if (trips.some((t) => !t.podId)) return new Response("A trip on this invoice has no POD", { status: 422 });

  const meta = { number: inv.number, client: inv.client, cycle: inv.cycle, createdAt: inv.createdAt };
  const base = url.origin;
  const name = invoiceNo(inv.number);

  await db.invoice.update({ where: { id }, data: { exportedAt: new Date() } });

  if (f.data === "tally") {
    const xml = buildTallyXml(meta, trips, { company: process.env.TALLY_COMPANY ?? "Company A", baseUrl: base });
    return new Response(xml, {
      headers: { "content-type": "application/xml; charset=utf-8", "content-disposition": `attachment; filename="${name}-tally.xml"` },
    });
  }
  return new Response("\uFEFF" + buildCsv(meta, trips, base), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${name}.csv"` },
  });
}

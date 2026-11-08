import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const body = z.object({ client: z.string().min(1).max(100), cycle: z.string().regex(/^\d{4}-W\d{2}$/) });
const err = (m: string, s: number) => NextResponse.json({ error: m }, { status: s });

class Empty extends Error {}

/** Group every verified, not-yet-invoiced trip of one client and cycle into an invoice. Nothing is sent anywhere. */
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return err("Sign in first", 401);
  if (session.user.role !== "BILLING") return err("Only billing can create invoices", 403);

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("Pick a client and cycle", 400);
  const { client, cycle } = parsed.data;

  try {
    const invoice = await db.$transaction(async (tx) => {
      const trips = await tx.trip.findMany({
        where: { client, clientCycle: cycle, podStatus: "VERIFIED", invoiceId: null },
        select: { id: true },
      });
      if (trips.length === 0) throw new Empty();
      const inv = await tx.invoice.create({ data: { client, cycle } });
      // The invoiceId: null guard means two people clicking at once cannot invoice the same trip twice.
      const res = await tx.trip.updateMany({ where: { id: { in: trips.map((t) => t.id) }, invoiceId: null }, data: { invoiceId: inv.id } });
      if (res.count !== trips.length) throw new Empty();
      return inv;
    });
    return NextResponse.json({ id: invoice.id });
  } catch (e) {
    if (e instanceof Empty) return err("These trips were already invoiced. Refresh the page", 409);
    console.error(e);
    return err("Could not create the invoice", 500);
  }
}

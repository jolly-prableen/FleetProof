import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const body = z.object({
  action: z.enum(["approve", "reject"]),
  fields: z.object({
    lr: z.string().max(60),
    qty: z.string().max(80),
    remarks: z.string().max(200),
    date: z.string().max(20),
    stamp: z.boolean(),
    signature: z.boolean(),
  }),
  note: z.string().max(150).optional(),
});

const err = (m: string, s: number) => NextResponse.json({ error: m }, { status: s });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return err("Sign in first", 401);
  if (session.user.role !== "BILLING") return err("Only billing can review PODs", 403);

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return err("Check the fields and try again", 400);
  const { action, fields, note } = parsed.data;
  if (action === "reject" && (!note || note.trim().length < 3)) return err("Add a note for the driver", 400);

  const { id } = await params;
  const trip = await db.trip.findUnique({
    where: { id },
    include: { pods: { orderBy: { uploadedAt: "desc" }, take: 1 } },
  });
  const pod = trip?.pods[0];
  if (!trip || !pod) return err("Trip not found", 404);
  // Only an open review can be decided, so two executives cannot overwrite each other.
  if (trip.podStatus !== "NEEDS_REVIEW") return err("This POD was already decided", 409);

  // Audit trail: keep what the AI read next to what the executive changed it to.
  const before = (pod.extracted ?? {}) as Record<string, unknown>;
  const changed: Record<string, { from: unknown; to: unknown }> = {};
  (Object.keys(fields) as (keyof typeof fields)[]).forEach((k) => {
    const was = before[k] ?? (typeof fields[k] === "boolean" ? false : "");
    if (was !== fields[k]) changed[k] = { from: was, to: fields[k] };
  });

  const approve = action === "approve";
  await db.$transaction([
    db.pod.update({
      where: { id: pod.id },
      data: {
        correctedBy: session.user.id,
        correctedFields: Object.keys(changed).length ? (changed as Prisma.InputJsonValue) : Prisma.DbNull,
      },
    }),
    db.trip.update({
      where: { id: trip.id },
      data: {
        podStatus: approve ? "VERIFIED" : "REJECTED",
        remarks: approve ? fields.remarks || null : note!.trim(),
      },
    }),
  ]);

  return NextResponse.json({ ok: true, status: approve ? "VERIFIED" : "REJECTED" });
}

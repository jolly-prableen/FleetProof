import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { extractPod } from "@/lib/ai";
import { decide, MAX_RETAKES, type Extracted, type Reason } from "@/lib/podRules";
import { REASON_TEXT } from "@/lib/messages";

export const MAX_BYTES = 300 * 1024;

const opt = (v: FormDataEntryValue | null) => (typeof v === "string" && v.trim() !== "" ? v : undefined);

const metaSchema = z.object({
  tripId: z.string().regex(/^TRP-\d{3,8}$/),
  clientId: z.string().min(8).max(64),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  capturedAt: z.coerce.date(),
});

export type UploadFailure = { message: string; status: number };
export type UploadResponse = { kind: "success"; body: ReturnType<typeof summary> } | { kind: "error"; failure: UploadFailure };

export async function processPodUpload(form: FormData, trip: { id: string; lrNumber: string; driverId: string | null; podStatus: string; retakeCount: number; deliveredAt: Date | null }): Promise<UploadResponse> {
  const meta = metaSchema.safeParse({
    tripId: opt(form.get("tripId")),
    clientId: opt(form.get("clientId")),
    lat: opt(form.get("lat")),
    lng: opt(form.get("lng")),
    capturedAt: opt(form.get("capturedAt")),
  });
  if (!meta.success) return { kind: "error", failure: { message: "Missing or invalid trip details", status: 400 } };
  const m = meta.data;
  const age = Date.now() - m.capturedAt.getTime();
  if (age < -10 * 60_000 || age > 30 * 86_400_000) return { kind: "error", failure: { message: "Photo time looks wrong. Check the phone clock", status: 400 } };

  const file = form.get("image");
  if (!(file instanceof File)) return { kind: "error", failure: { message: "No photo", status: 400 } };
  if (file.size === 0 || file.size > MAX_BYTES) return { kind: "error", failure: { message: "Photo must be under 300 KB", status: 413 } };
  const buf = Buffer.from(await file.arrayBuffer());
  if (!(buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)) return { kind: "error", failure: { message: "Photo must be a JPEG", status: 415 } };

  const existing = await db.pod.findUnique({ where: { clientId: m.clientId } });
  if (existing) return { kind: "success", body: summary(existing.outcome, existing.reasons as Reason[], trip.retakeCount) };
  if (trip.podStatus === "VERIFIED" || trip.podStatus === "NEEDS_REVIEW") return { kind: "error", failure: { message: "This POD is already submitted", status: 409 } };

  let extracted: Extracted | null = null;
  let confidence: number | null = null;
  let outcome: "VERIFIED" | "RETAKE_REQUESTED" | "NEEDS_REVIEW";
  let reasons: Reason[];
  try {
    const r = await extractPod(buf, trip.lrNumber);
    extracted = r.extracted;
    confidence = r.confidence;
    if (r.forcedOutcome) {
      outcome = r.forcedOutcome;
      reasons = r.forcedReasons ?? [];
    } else {
      ({ outcome, reasons } = decide(r.extracted, r.confidence, trip.lrNumber, trip.retakeCount));
    }
  } catch (e) {
    console.error("AI check failed:", e instanceof Error ? e.message : e);
    outcome = "NEEDS_REVIEW";
    reasons = ["AI_UNAVAILABLE"];
  }

  const retakeCount = outcome === "RETAKE_REQUESTED" ? trip.retakeCount + 1 : trip.retakeCount;
  const remarks = extracted?.remarks || (reasons.length ? reasons.map((x) => REASON_TEXT[x]).join(". ") : null);
  try {
    await db.$transaction([
      db.pod.create({
        data: {
          clientId: m.clientId, tripId: trip.id, image: buf, sizeKb: Math.ceil(buf.length / 1024),
          lat: m.lat, lng: m.lng, capturedAt: m.capturedAt,
          extracted: extracted ? (extracted as unknown as Prisma.InputJsonValue) : undefined,
          confidence, reasons, outcome,
        },
      }),
      db.trip.update({
        where: { id: trip.id },
        data: { podStatus: outcome, retakeCount, remarks, deliveredAt: trip.deliveredAt ?? m.capturedAt },
      }),
    ]);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { kind: "success", body: summary(outcome, reasons, retakeCount) };
    console.error(e);
    return { kind: "error", failure: { message: "Could not save. Try again", status: 500 } };
  }
  return { kind: "success", body: summary(outcome, reasons, retakeCount) };
}

function summary(outcome: string, reasons: Reason[], retakeCount: number) {
  return { uploaded: true, outcome, reasons, retakesLeft: Math.max(0, MAX_RETAKES - retakeCount) };
}

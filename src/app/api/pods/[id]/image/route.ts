import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return new Response("Sign in first", { status: 401 });
  const { id } = await params;
  const pod = await db.pod.findUnique({ where: { id }, include: { trip: { select: { driverId: true } } } });
  if (!pod) return new Response("Not found", { status: 404 });
  // Billing sees every POD; a driver sees only their own. Consignee data is personal data (DPDP).
  if (session.user.role === "DRIVER" && pod.trip.driverId !== session.user.id) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(new Uint8Array(pod.image), {
    headers: { "content-type": pod.mime, "cache-control": "private, max-age=3600" },
  });
}

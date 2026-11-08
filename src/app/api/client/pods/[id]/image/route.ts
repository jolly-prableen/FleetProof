import { db } from "@/lib/db";
import { isShareActive } from "@/lib/shareAccess";
import { clientKey, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const throttle = rateLimit(clientKey(req, "client-pod-image"), 60);
  if (!throttle.allowed) return new Response("Too many requests", { status: 429, headers: { "retry-after": String(throttle.retryAfter) } });
  const { id } = await params;
  const token = new URL(req.url).searchParams.get("token");
  if (!token) return new Response("Not found", { status: 404 });
  const pod = await db.pod.findFirst({
    where: { id, trip: { invoice: { shareToken: token } } },
    include: { trip: { include: { invoice: { select: { shareToken: true, shareTokenExpiresAt: true, shareRevokedAt: true } } } } },
  });
  if (!pod || !pod.trip.invoice || !isShareActive(pod.trip.invoice.shareToken, token, pod.trip.invoice.shareTokenExpiresAt, pod.trip.invoice.shareRevokedAt)) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(pod.image), { headers: { "content-type": pod.mime, "cache-control": "private, max-age=300" } });
}

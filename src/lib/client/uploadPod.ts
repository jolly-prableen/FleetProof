export type UploadItem = {
  clientId: string;
  tripId: string;
  blob: Blob;
  lat: number | null;
  lng: number | null;
  capturedAt: string; // ISO, stamped on the device at capture
  endpoint?: string;
  token?: string;
};

export type UploadResult = {
  uploaded: true;
  outcome: "VERIFIED" | "RETAKE_REQUESTED" | "NEEDS_REVIEW";
  reasons: string[];
  retakesLeft: number;
};

/** Network trouble or a server fault: safe to keep and retry later. */
export class RetryableError extends Error {}
/** The server said no (bad input, not your trip, already submitted): retrying will not help. */
export class RejectedError extends Error {}

export async function uploadPod(item: UploadItem): Promise<UploadResult> {
  const fd = new FormData();
  fd.set("tripId", item.tripId);
  fd.set("clientId", item.clientId);
  fd.set("capturedAt", item.capturedAt);
  if (item.lat !== null) fd.set("lat", String(item.lat));
  if (item.lng !== null) fd.set("lng", String(item.lng));
  if (item.token) fd.set("token", item.token);
  fd.set("image", item.blob, "pod.jpg");

  let res: Response;
  try {
    res = await fetch(item.endpoint ?? "/api/pods", { method: "POST", body: fd });
  } catch {
    throw new RetryableError("offline");
  }
  if (res.status >= 500 || res.status === 401) throw new RetryableError(`server ${res.status}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new RejectedError(body.error ?? "Upload failed");
  return body as UploadResult;
}

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

import { openDB } from "idb";
import { RejectedError, RetryableError, uploadPod, type UploadItem } from "./uploadPod";

const DB = "pod-queue";
const STORE = "items";

const db = () =>
  openDB(DB, 1, { upgrade: (d) => void d.createObjectStore(STORE, { keyPath: "clientId" }) });

export async function enqueue(item: UploadItem) {
  await (await db()).put(STORE, item);
}

export async function queuedCount(): Promise<number> {
  try {
    return await (await db()).count(STORE);
  } catch {
    return 0;
  }
}

let flushing = false;

/** Try to send every saved photo. Returns how many reached the server and how many were refused. */
export async function flushQueue(): Promise<{ sent: number; refused: number }> {
  if (flushing) return { sent: 0, refused: 0 };
  flushing = true;
  let sent = 0;
  let refused = 0;
  try {
    const d = await db();
    const items = (await d.getAll(STORE)) as UploadItem[];
    for (const item of items) {
      try {
        await uploadPod(item);
        await d.delete(STORE, item.clientId);
        sent++;
      } catch (e) {
        if (e instanceof RejectedError) {
          await d.delete(STORE, item.clientId); // will never succeed, so do not loop forever
          refused++;
        } else if (e instanceof RetryableError) {
          break; // still no signal: stop and try later
        } else throw e;
      }
    }
  } finally {
    flushing = false;
  }
  return { sent, refused };
}

"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { flushQueue, queuedCount } from "@/lib/client/offlineQueue";

/** Sends photos saved while offline as soon as signal returns, and says so. */
export function QueueSync() {
  const router = useRouter();
  const [waiting, setWaiting] = useState(0);

  const sync = useCallback(async () => {
    const { sent } = await flushQueue();
    setWaiting(await queuedCount());
    if (sent > 0) router.refresh();
  }, [router]);

  useEffect(() => {
    void sync();
    window.addEventListener("online", sync);
    const t = setInterval(sync, 30_000);
    return () => {
      window.removeEventListener("online", sync);
      clearInterval(t);
    };
  }, [sync]);

  if (waiting === 0) return null;
  return (
    <p role="status" className="mt-6 rounded-xl2 bg-review-bg px-4 py-3 text-review">
      {waiting} photo{waiting > 1 ? "s" : ""} saved on this phone. Sending when there is network.
    </p>
  );
}

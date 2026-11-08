"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export type Fields = { lr: string; qty: string; remarks: string; date: string; stamp: boolean; signature: boolean };

export function ReviewForm({ tripId, initial }: { tripId: string; initial: Fields }) {
  const router = useRouter();
  const [f, setF] = useState<Fields>(initial);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<null | "approve" | "reject">(null);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof Fields>(k: K, v: Fields[K]) => setF((p) => ({ ...p, [k]: v }));

  async function send(action: "approve" | "reject") {
    setError(null);
    if (action === "reject" && note.trim().length < 3) {
      setError("Write a short note for the driver before rejecting.");
      return;
    }
    setBusy(action);
    try {
      const res = await fetch(`/api/trips/${tripId}/review`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action, fields: f, note: note.trim() || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Could not save. Try again.");
      router.push("/billing/review");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save. Try again.");
      setBusy(null);
    }
  }

  const input = "w-full rounded-lg border border-line px-3 py-2 text-base";

  return (
    <form onSubmit={(e) => e.preventDefault()} className="mt-6 space-y-4">
      <p className="text-sm text-ink-soft">What the AI read. Fix anything that does not match the photo. The photo is the source of truth.</p>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold">LR number</span>
        <input className={input} value={f.lr} onChange={(e) => set("lr", e.target.value)} maxLength={60} />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Quantity received</span>
          <input className={input} value={f.qty} onChange={(e) => set("qty", e.target.value)} maxLength={80} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-semibold">Delivery date</span>
          <input className={input} value={f.date} onChange={(e) => set("date", e.target.value)} placeholder="YYYY-MM-DD" maxLength={20} />
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Shortage or damage remarks</span>
        <input className={input} value={f.remarks} onChange={(e) => set("remarks", e.target.value)} maxLength={200} />
      </label>
      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={f.stamp} onChange={(e) => set("stamp", e.target.checked)} /> Consignee stamp present</label>
        <label className="flex items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={f.signature} onChange={(e) => set("signature", e.target.checked)} /> Signature present</label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Note for the driver (needed to reject)</span>
        <input className={input} value={note} onChange={(e) => setNote(e.target.value)} maxLength={150} placeholder="Example: LR number is cut off" />
      </label>

      {error && <p role="alert" className="rounded-lg bg-warn-bg px-4 py-3 text-sm text-warn">{error}</p>}

      <div className="flex flex-wrap gap-3 pt-2">
        <button type="button" onClick={() => send("approve")} disabled={busy !== null}
          className="rounded-lg bg-ok px-6 py-3 font-semibold text-white disabled:opacity-60">
          {busy === "approve" ? "Approving…" : "Approve POD"}
        </button>
        <button type="button" onClick={() => send("reject")} disabled={busy !== null}
          className="rounded-lg border border-warn px-6 py-3 font-semibold text-warn disabled:opacity-60">
          {busy === "reject" ? "Rejecting…" : "Reject and ask for new photo"}
        </button>
      </div>
      <p className="text-sm text-ink-soft">Approving makes the trip ready to bill. Nothing is sent to the client automatically.</p>
    </form>
  );
}

"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateInvoiceButton({ client, cycle }: { client: string; cycle: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/invoices", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ client, cycle }),
    }).catch(() => null);
    const body = await res?.json().catch(() => ({}));
    if (!res || !res.ok) {
      setError(body?.error ?? "No connection. Try again.");
      setBusy(false);
      if (res?.status === 409) router.refresh();
      return;
    }
    router.push(`/billing/invoices/${body.id}`);
  }

  return (
    <div>
      <button onClick={go} disabled={busy} className="rounded-lg bg-brand px-5 py-2.5 font-semibold text-white hover:bg-brand-dark disabled:opacity-60">
        {busy ? "Creating…" : "Create invoice"}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-warn">{error}</p>}
    </div>
  );
}

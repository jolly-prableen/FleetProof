"use client";

import { useState } from "react";

export function ShareInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [result, setResult] = useState<{ url: string; expiresAt: string } | { error: string } | null>(null);
  const [revoked, setRevoked] = useState(false);

  async function createLink() {
    const response = await fetch(`/api/invoices/${invoiceId}/share`, { method: "POST" });
    const body = await response.json();
    setResult(response.ok ? body : { error: body.error ?? "Could not create link" });
  }

  if (result && "error" in result) return <span className="text-sm text-warn">{result.error}</span>;
  async function revokeLink() {
    const response = await fetch(`/api/invoices/${invoiceId}/share/revoke`, { method: "POST" });
    if (response.ok) setRevoked(true);
  }
  if (result) return <span className="max-w-full text-sm"><a className={`break-all font-semibold text-brand underline ${revoked ? "line-through opacity-60" : ""}`} href={revoked ? undefined : result.url}>{result.url}</a><span className="block text-ink-soft">{revoked ? "Link revoked" : "Valid for 7 days"}</span>{!revoked && <button onClick={revokeLink} className="mt-1 min-h-10 text-warn underline">Switch off link</button>}</span>;
  return <button onClick={createLink} className="min-h-11 rounded-lg border border-brand px-5 py-3 font-semibold text-brand hover:bg-wash">Create client link</button>;
}

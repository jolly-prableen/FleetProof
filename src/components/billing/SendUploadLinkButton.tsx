"use client";

import { useState } from "react";

export function SendUploadLinkButton({ tripId }: { tripId: string }) {
  const [state, setState] = useState<{ url: string; expiresAt: string } | { error: string } | null>(null);
  async function send() {
    const res = await fetch(`/api/trips/${tripId}/upload-token`, { method: "POST" });
    const body = await res.json();
    setState(res.ok ? body : { error: body.error ?? "Could not create link" });
  }
  if (state && "error" in state) return <span className="text-sm text-warn">{state.error}</span>;
  if (state) return <span className="max-w-full text-sm"><a className="break-all font-semibold text-brand underline" href={state.url}>{state.url}</a><span className="block text-ink-soft">Valid for 7 days</span></span>;
  return <button onClick={send} className="min-h-10 rounded-lg border border-brand px-3 py-2 text-sm font-semibold text-brand hover:bg-wash">Send upload link</button>;
}

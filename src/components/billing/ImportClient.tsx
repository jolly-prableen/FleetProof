"use client";

import { useState } from "react";

type Result = { imported: number; skipped: number; issues: { row: number; tripId: string; reason: string }[] };

export function ImportClient() {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setError(""); setResult(null);
    const res = await fetch("/api/trips/import", { method: "POST", body: new FormData(e.currentTarget) });
    const body = await res.json();
    if (res.ok) setResult(body); else setError(body.error ?? "Import failed");
    setBusy(false);
  }
  return (
    <>
      <h2 className="text-2xl font-bold">Import trips</h2>
      <p className="mt-1 text-ink-soft">Upload the daily CSV. Existing Trip IDs are skipped, so importing the same file twice is safe.</p>
      <form onSubmit={submit} className="mt-8 rounded-xl2 border border-line p-6">
        <label className="block text-sm font-semibold" htmlFor="file">CSV file</label>
        <input id="file" name="file" type="file" accept=".csv,text/csv" required className="mt-3 block w-full rounded-lg border border-line p-3" />
        <p className="mt-3 text-xs text-ink-soft">Columns: Trip ID, Client, Vehicle, Hired, Branch, To, Freight, LR number, E-way bill number, Consignee name, Consignee phone</p>
        <button disabled={busy} className="mt-6 rounded-xl2 bg-brand px-6 py-3 font-bold text-white disabled:opacity-50">{busy ? "Importing…" : "Import CSV"}</button>
      </form>
      {error && <p role="alert" className="mt-6 rounded-lg bg-warn-bg p-4 text-warn">{error}</p>}
      {result && <section className="mt-8">
        <p className="font-semibold">{result.imported} imported · {result.skipped} existing Trip IDs skipped</p>
        {result.issues.length > 0 && <div className="mt-4 overflow-x-auto rounded-xl2 border border-line"><table className="w-full text-left text-sm"><thead className="bg-wash"><tr><th className="p-3">Row</th><th className="p-3">Trip</th><th className="p-3">Reason</th></tr></thead><tbody className="divide-y divide-line">{result.issues.map((issue, i) => <tr key={`${issue.row}-${issue.tripId}-${i}`}><td className="p-3">{issue.row || "—"}</td><td className="p-3">{issue.tripId || "—"}</td><td className="p-3">{issue.reason}</td></tr>)}</tbody></table></div>}
      </section>}
    </>
  );
}

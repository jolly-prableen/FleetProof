export function BillingLoading({ detail = false }: { detail?: boolean }) {
  return (
    <div role="status" aria-live="polite" aria-label="Loading billing page" className="animate-pulse">
      <span className="sr-only">Loading billing page</span>
      <div className="h-8 w-56 rounded-lg bg-line/60" />
      <div className="mt-3 h-4 w-80 max-w-full rounded bg-line/50" />
      <div className={`mt-8 grid gap-4 ${detail ? "md:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
        {Array.from({ length: detail ? 2 : 4 }, (_, index) => (
          <div key={index} className="rounded-xl2 border border-line p-5">
            <div className="h-5 w-32 rounded bg-line/60" />
            <div className="mt-4 h-10 w-20 rounded bg-line/50" />
            <div className="mt-4 h-4 w-full rounded bg-line/40" />
            <div className="mt-2 h-4 w-4/5 rounded bg-line/40" />
          </div>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";

export function BrandMark({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5" aria-label="POD Desk home">
      <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-lg font-bold text-white shadow-sm">
        <span className="relative -top-px">✓</span>
      </span>
      <span className={compact ? "sr-only" : "text-lg font-bold tracking-tight text-ink"}>POD Desk</span>
    </Link>
  );
}

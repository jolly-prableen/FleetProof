export const DAY = 86_400_000;

export const daysBetween = (from: Date, to: Date) => Math.max(0, Math.floor((to.getTime() - from.getTime()) / DAY));

export function mean(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10;
}

export type BranchMissing = { branch: string; missing: number; oldestDays: number };

/** Trips without a usable POD, per branch, with how long the oldest has been waiting. */
export function missingByBranch(rows: { branch: string; deliveredAt: Date | null }[], now: Date): BranchMissing[] {
  const m = new Map<string, BranchMissing>();
  for (const r of rows) {
    const days = r.deliveredAt ? daysBetween(r.deliveredAt, now) : 0;
    const cur = m.get(r.branch) ?? { branch: r.branch, missing: 0, oldestDays: 0 };
    cur.missing += 1;
    cur.oldestDays = Math.max(cur.oldestDays, days);
    m.set(r.branch, cur);
  }
  return [...m.values()].sort((a, b) => b.missing - a.missing || a.branch.localeCompare(b.branch));
}

/** Average days from POD capture to invoice, per branch. */
export function lagByBranch(rows: { branch: string; lagDays: number }[]): Record<string, number> {
  const by: Record<string, number[]> = {};
  for (const r of rows) (by[r.branch] ??= []).push(r.lagDays);
  return Object.fromEntries(Object.entries(by).map(([b, xs]) => [b, mean(xs)!]));
}

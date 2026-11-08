import type { PodStatus } from "@prisma/client";

const MAP: Record<PodStatus, { label: string; cls: string }> = {
  PENDING: { label: "Waiting for POD", cls: "bg-wash text-ink-soft" },
  VERIFIED: { label: "Verified", cls: "bg-ok-bg text-ok" },
  RETAKE_REQUESTED: { label: "Retake needed", cls: "bg-warn-bg text-warn" },
  NEEDS_REVIEW: { label: "Needs review", cls: "bg-review-bg text-review" },
  REJECTED: { label: "Rejected", cls: "bg-warn-bg text-warn" },
};

export function StatusBadge({ status }: { status: PodStatus }) {
  const m = MAP[status];
  return <span className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${m.cls}`}>{m.label}</span>;
}

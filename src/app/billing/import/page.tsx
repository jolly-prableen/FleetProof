import { requireRole } from "@/lib/auth";
import { BillingShell } from "@/components/billing/BillingShell";
import { ImportClient } from "@/components/billing/ImportClient";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  const user = await requireRole("BILLING");
  return <BillingShell userName={user.name ?? ""}><ImportClient /></BillingShell>;
}

export const inr = (n: number) => "₹" + n.toLocaleString("en-IN");

export function dateTime(d: Date | string) {
  return new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}

/** Consignee phones are personal data (DPDP Act 2023): show only the ends. */
export function maskPhone(p: string) {
  return p.length < 6 ? "••••" : `${p.slice(0, 2)}••••••${p.slice(-2)}`;
}

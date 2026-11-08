/** Builders for the Tally XML and CSV files. Pure functions, so they are easy to test. */

export type ExportTrip = {
  id: string;
  lrNumber: string;
  ewayBill: string;
  vehicle: string;
  destination: string;
  freight: number;
  podId: string | null;
};
export type ExportInvoice = { number: number; client: string; cycle: string; createdAt: Date };

export const invoiceNo = (n: number) => `INV-${String(n).padStart(4, "0")}`;

export const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** Tally wants YYYYMMDD. Use India time so a late-evening export does not slip to the next day. */
export const tallyDate = (d: Date) =>
  d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }).replaceAll("-", "");

export const totalFreight = (trips: ExportTrip[]) => trips.reduce((a, t) => a + t.freight, 0);

/** One sales voucher per invoice: client debited once, freight income credited once per trip. */
export function buildTallyXml(
  inv: ExportInvoice,
  trips: ExportTrip[],
  opts: { company: string; baseUrl: string; incomeLedger?: string },
): string {
  const income = opts.incomeLedger ?? "Freight Income";
  const total = totalFreight(trips);
  const narration = [
    `Freight for ${inv.cycle}.`,
    ...trips.map((t) => `${t.id} LR ${t.lrNumber} EWB ${t.ewayBill} ${t.vehicle} to ${t.destination}` + (t.podId ? ` POD ${opts.baseUrl}/api/pods/${t.podId}/image` : "")),
  ].join("\n");

  const credits = trips
    .map(
      (t) => `        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${xmlEscape(income)}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
          <AMOUNT>${t.freight.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER><TALLYREQUEST>Import Data</TALLYREQUEST></HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES><SVCURRENTCOMPANY>${xmlEscape(opts.company)}</SVCURRENTCOMPANY></STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
      <VOUCHER VCHTYPE="Sales" ACTION="Create" OBJVIEW="Accounting Voucher View">
        <DATE>${tallyDate(inv.createdAt)}</DATE>
        <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
        <VOUCHERNUMBER>${invoiceNo(inv.number)}</VOUCHERNUMBER>
        <PARTYLEDGERNAME>${xmlEscape(inv.client)}</PARTYLEDGERNAME>
        <NARRATION>${xmlEscape(narration)}</NARRATION>
        <ALLLEDGERENTRIES.LIST>
          <LEDGERNAME>${xmlEscape(inv.client)}</LEDGERNAME>
          <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
          <AMOUNT>-${total.toFixed(2)}</AMOUNT>
        </ALLLEDGERENTRIES.LIST>
${credits}
      </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>
`;
}

/** Spreadsheet programs run text that starts with = + - @ as a formula. Defuse it. */
export function csvCell(v: string | number): string {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s) && typeof v === "string") s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildCsv(inv: ExportInvoice, trips: ExportTrip[], baseUrl: string): string {
  const head = ["Invoice no", "Client", "Cycle", "Trip ID", "LR number", "E-way bill", "Vehicle", "Destination", "Freight (INR)", "POD link"];
  const rows = trips.map((t) => [
    invoiceNo(inv.number), inv.client, inv.cycle, t.id, t.lrNumber, t.ewayBill, t.vehicle, t.destination, t.freight,
    t.podId ? `${baseUrl}/api/pods/${t.podId}/image` : "",
  ]);
  return [head, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

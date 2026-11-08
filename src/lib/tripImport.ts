export const IMPORT_HEADERS = [
  "Trip ID", "Client", "Vehicle", "Hired", "Branch", "To", "Freight",
  "LR number", "E-way bill number", "Consignee name", "Consignee phone",
] as const;

export type TripImportRow = {
  id: string;
  client: string;
  vehicle: string;
  hired: boolean;
  branch: string;
  destination: string;
  freight: number;
  lrNumber: string;
  ewayBill: string;
  consigneeName: string;
  consigneePhone: string;
};

export type ImportIssue = { row: number; tripId: string; reason: string };

export function parseCsv(input: string): { rows: string[][]; error?: string } {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(cell.trim()); cell = ""; }
    else if (ch === "\n") { row.push(cell.trim()); rows.push(row); row = []; cell = ""; }
    else if (ch !== "\r") cell += ch;
  }
  if (quoted) return { rows: [], error: "A quoted field was not closed" };
  if (cell || row.length) { row.push(cell.trim()); rows.push(row); }
  return { rows: rows.filter((r) => r.some(Boolean)) };
}

export function validateImportRows(rows: string[][]): { valid: TripImportRow[]; issues: ImportIssue[] } {
  const valid: TripImportRow[] = [];
  const issues: ImportIssue[] = [];
  if (!rows.length) return { valid, issues: [{ row: 1, tripId: "", reason: "CSV is empty" }] };
  const headers = rows[0].map((h) => h.replace(/^\uFEFF/, ""));
  if (headers.length !== IMPORT_HEADERS.length || headers.some((h, i) => h !== IMPORT_HEADERS[i])) {
    return { valid, issues: [{ row: 1, tripId: "", reason: `Columns must be: ${IMPORT_HEADERS.join(", ")}` }] };
  }
  const ids = new Set<string>();
  const lrs = new Set<string>();
  for (let i = 1; i < rows.length; i++) {
    const [id, client, vehicle, hired, branch, destination, freight, lrNumber, ewayBill, consigneeName, consigneePhone] = rows[i];
    const problems: string[] = [];
    if (!/^TRP-\d{3,8}$/.test(id ?? "")) problems.push("Trip ID must look like TRP-66120");
    if (ids.has(id)) problems.push("Trip ID is duplicated in this file");
    ids.add(id);
    if (!client) problems.push("Client is required");
    if (!vehicle) problems.push("Vehicle is required");
    if (!/^(yes|no)$/i.test(hired ?? "")) problems.push("Hired must be yes or no");
    if (!branch) problems.push("Branch is required");
    if (!destination) problems.push("To is required");
    const amount = Number(freight);
    if (!Number.isInteger(amount) || amount <= 0) problems.push("Freight must be a positive whole number");
    if (!/^LR-\d{3,20}$/i.test(lrNumber ?? "")) problems.push("LR number is invalid");
    const normalizedLr = (lrNumber ?? "").toUpperCase();
    if (lrs.has(normalizedLr)) problems.push("LR number is duplicated in this file");
    lrs.add(normalizedLr);
    if (!/^\d{12}$/.test(ewayBill ?? "")) problems.push("E-way bill must be 12 digits");
    if (!consigneeName) problems.push("Consignee name is required");
    if (!/^\d{10}$/.test(consigneePhone ?? "")) problems.push("Consignee phone must be 10 digits");
    if (problems.length) issues.push({ row: i + 1, tripId: id ?? "", reason: problems.join("; ") });
    else valid.push({ id, client, vehicle, hired: hired.toLowerCase() === "yes", branch, destination, freight: amount, lrNumber, ewayBill, consigneeName, consigneePhone });
  }
  return { valid, issues };
}

export function currentCycle(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - start.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

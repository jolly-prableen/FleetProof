import { describe, expect, it } from "vitest";
import { currentCycle, parseCsv, validateImportRows } from "./tripImport";

const header = "Trip ID,Client,Vehicle,Hired,Branch,To,Freight,LR number,E-way bill number,Consignee name,Consignee phone";
const row = "TRP-66150,Company B,MH20 EL 4521,no,Nashik,Pune,38500,LR-9911,391020000001,Sharma Traders,9812345678";

describe("trip import", () => {
  it("parses quoted commas and escaped quotes", () => {
    expect(parseCsv(`${header}\nTRP-66150,"Company B, Ltd",MH20 EL 4521,no,Nashik,Pune,38500,LR-9911,391020000001,"Sharma ""Traders""",9812345678`).rows[1][1]).toBe("Company B, Ltd");
  });

  it("validates a valid row and rejects invalid fields", () => {
    const result = validateImportRows([[...header.split(",")], [...row.split(",")], [...row.replace("38500", "-1").split(",")]]);
    expect(result.valid).toHaveLength(1);
    expect(result.issues[0].reason).toContain("positive");
  });

  it("rejects duplicate trip and LR numbers in one file", () => {
    const result = validateImportRows([[...header.split(",")], [...row.split(",")], [...row.replace("TRP-66150", "TRP-66151").split(",")]]);
    expect(result.valid).toHaveLength(1);
    expect(result.issues[0].reason).toContain("LR number");
  });

  it("formats an ISO cycle", () => {
    expect(currentCycle(new Date("2026-11-03T00:00:00Z"))).toBe("2026-W45");
  });
});

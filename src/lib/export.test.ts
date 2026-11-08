import { describe, it, expect } from "vitest";
import { buildCsv, buildTallyXml, csvCell, invoiceNo, tallyDate, xmlEscape, type ExportTrip } from "./export";

const trips: ExportTrip[] = [
  { id: "TRP-1", lrNumber: "LR-1", ewayBill: "391000000001", vehicle: "MH20 EL 4521", destination: "Nagpur", freight: 38500, podId: "pod1" },
  { id: "TRP-2", lrNumber: "LR-2", ewayBill: "391000000002", vehicle: "MH20 GT 7718", destination: "Pune", freight: 26000.5, podId: null },
];
const inv = { number: 7, client: "Company B & Sons <cement>", cycle: "2026-W45", createdAt: new Date("2026-11-03T20:00:00Z") };

describe("invoiceNo", () => {
  it("pads the number", () => expect(invoiceNo(7)).toBe("INV-0007"));
});

describe("tallyDate", () => {
  it("uses India time, so 20:00 UTC is already the next day", () => expect(tallyDate(inv.createdAt)).toBe("20261104"));
});

describe("xmlEscape", () => {
  it("escapes the five XML characters", () => expect(xmlEscape(`<a href="x">&'`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;&apos;"));
});

describe("buildTallyXml", () => {
  const xml = buildTallyXml(inv, trips, { company: "Company A", baseUrl: "https://app.test" });
  it("debits the client with the exact total and credits each trip", () => {
    expect(xml).toContain("<AMOUNT>-64500.50</AMOUNT>");
    expect(xml).toContain("<AMOUNT>38500.00</AMOUNT>");
    expect(xml).toContain("<AMOUNT>26000.50</AMOUNT>");
  });
  it("escapes the client name", () => expect(xml).toContain("Company B &amp; Sons &lt;cement&gt;"));
  it("puts the POD link in the narration only when a POD exists", () => {
    expect(xml).toContain("https://app.test/api/pods/pod1/image");
    expect(xml.match(/\/api\/pods\//g)?.length).toBe(1);
  });
  it("carries the invoice number and E-way bill", () => {
    expect(xml).toContain("<VOUCHERNUMBER>INV-0007</VOUCHERNUMBER>");
    expect(xml).toContain("EWB 391000000001");
  });
});

describe("csv", () => {
  it("defuses formula injection", () => expect(csvCell("=HYPERLINK(\"x\")")).toBe(`"'=HYPERLINK(""x"")"`));
  it("does not touch real numbers", () => expect(csvCell(-5)).toBe("-5"));
  it("quotes commas", () => expect(csvCell("a,b")).toBe('"a,b"'));
  it("has a header and one row per trip", () => {
    const lines = buildCsv(inv, trips, "https://app.test").trim().split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[0].startsWith("Invoice no,Client")).toBe(true);
  });
});

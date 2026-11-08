import { describe, it, expect } from "vitest";
import { parseExtraction } from "./parse";

const good = { readable: true, lr: "LR-1", stamp: true, signature: true, qty: "10", remarks: null, date: "2026-11-02", confidence: 0.9 };

describe("parseExtraction", () => {
  it("parses clean JSON", () => {
    expect(parseExtraction(JSON.stringify(good))?.confidence).toBe(0.9);
  });
  it("parses JSON wrapped in prose or code fences", () => {
    const r = parseExtraction("Here you go:\n```json\n" + JSON.stringify(good) + "\n```");
    expect(r?.extracted.lr).toBe("LR-1");
  });
  it("returns null for garbage", () => {
    expect(parseExtraction("I cannot read this")).toBeNull();
    expect(parseExtraction("{not json}")).toBeNull();
  });
  it("returns null when a field has the wrong type", () => {
    expect(parseExtraction(JSON.stringify({ ...good, stamp: "yes" }))).toBeNull();
  });
  it("rejects confidence outside 0 to 1", () => {
    expect(parseExtraction(JSON.stringify({ ...good, confidence: 4 }))).toBeNull();
  });
  it("clips very long text so a hostile photo cannot flood the database", () => {
    const r = parseExtraction(JSON.stringify({ ...good, remarks: "x".repeat(5000) }));
    expect(r?.extracted.remarks?.length).toBe(200);
  });
});

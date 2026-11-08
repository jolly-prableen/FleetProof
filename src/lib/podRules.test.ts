import { describe, it, expect } from "vitest";
import { decide, type Extracted } from "./podRules";

const good: Extracted = {
  readable: true,
  lr: "LR-8841",
  stamp: true,
  signature: true,
  qty: "120 bags",
  remarks: null,
  date: "2026-11-02",
};

describe("decide", () => {
  it("verifies a complete, confident POD", () => {
    expect(decide(good, 0.92, "LR-8841", 0)).toEqual({ outcome: "VERIFIED", reasons: [] });
  });

  it("ignores spacing and dashes when matching the LR number", () => {
    expect(decide({ ...good, lr: "lr 8841" }, 0.9, "LR-8841", 0).outcome).toBe("VERIFIED");
  });

  it("asks for a retake when the stamp is missing", () => {
    const d = decide({ ...good, stamp: false }, 0.9, "LR-8841", 0);
    expect(d.outcome).toBe("RETAKE_REQUESTED");
    expect(d.reasons).toContain("STAMP_MISSING");
  });

  it("asks for a retake when the photo is unreadable", () => {
    expect(decide({ ...good, readable: false }, 0.2, "LR-8841", 1).outcome).toBe("RETAKE_REQUESTED");
  });

  it("asks for a retake on an LR number mismatch", () => {
    const d = decide({ ...good, lr: "LR-9999" }, 0.9, "LR-8841", 0);
    expect(d.reasons).toContain("LR_MISMATCH");
  });

  it("sends to review once two retakes are used", () => {
    const d = decide({ ...good, signature: false }, 0.9, "LR-8841", 2);
    expect(d.outcome).toBe("NEEDS_REVIEW");
    expect(d.reasons).toContain("RETAKES_EXHAUSTED");
  });

  it("sends shortage remarks to review, not retake", () => {
    const d = decide({ ...good, remarks: "Short by 6 cartons" }, 0.95, "LR-8841", 0);
    expect(d.outcome).toBe("NEEDS_REVIEW");
    expect(d.reasons).toEqual(["SHORTAGE_OR_DAMAGE"]);
  });

  it("detects Hindi damage remarks", () => {
    expect(decide({ ...good, remarks: "3 बोरी खराब" }, 0.95, "LR-8841", 0).outcome).toBe("NEEDS_REVIEW");
  });

  it("sends low confidence to review", () => {
    const d = decide(good, 0.6, "LR-8841", 0);
    expect(d.outcome).toBe("NEEDS_REVIEW");
    expect(d.reasons).toEqual(["LOW_CONFIDENCE"]);
  });

  it("treats a harmless remark as verified", () => {
    expect(decide({ ...good, remarks: "Received in good condition" }, 0.9, "LR-8841", 0).outcome).toBe("VERIFIED");
  });
});

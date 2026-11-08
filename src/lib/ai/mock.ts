import type { Extracted, Reason } from "../podRules";

/**
 * Demo provider: no API key needed. It never inspects arbitrary photographs.
 * Explicit MOCK_AI_FIXTURE values are for deterministic tests and demos only.
 */
export function mockExtract(_image: Buffer, expectedLr: string): {
  extracted: Extracted;
  confidence: number;
  forcedOutcome?: "NEEDS_REVIEW";
  forcedReasons?: Reason[];
} {
  const fixture = process.env.MOCK_AI_FIXTURE;
  const base: Extracted = {
    readable: true, lr: expectedLr, stamp: true, signature: true,
    qty: "As per LR", remarks: null, date: new Date().toISOString().slice(0, 10),
  };
  if (fixture === "provider-failure") throw new Error("Controlled mock provider failure");
  if (fixture === "verified") return { extracted: base, confidence: 0.93 };
  if (fixture === "missing-stamp") return { extracted: { ...base, stamp: false }, confidence: 0.9 };
  if (fixture === "missing-signature") return { extracted: { ...base, signature: false }, confidence: 0.9 };
  if (fixture === "low-confidence") return { extracted: base, confidence: 0.6 };
  if (fixture === "shortage") return { extracted: { ...base, remarks: "Short by 4 bags" }, confidence: 0.9 };

  return {
    extracted: { readable: false, lr: null, stamp: false, signature: false, qty: null, remarks: null, date: null },
    confidence: 0,
    forcedOutcome: "NEEDS_REVIEW",
    forcedReasons: ["AI_UNAVAILABLE"],
  };
}

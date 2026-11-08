/**
 * Decision rules applied to what the vision model extracted from a POD photo.
 * Pure function: no I/O, so it is easy to test and easy to explain.
 *
 * retake   -> photo is unusable or a required mark is missing, and the driver still has retakes left
 * review   -> a person must look: shortage/damage remark, low confidence, or retakes used up
 * verified -> everything present, confident, no remarks
 *
 * The image stays the source of truth. Invoices are never sent automatically.
 */
export const MAX_RETAKES = 2;
export const CONFIDENCE_THRESHOLD = 0.75;

export type Extracted = {
  readable: boolean;
  lr: string | null;
  stamp: boolean;
  signature: boolean;
  qty: string | null;
  remarks: string | null;
  date: string | null;
};

export type Outcome = "VERIFIED" | "RETAKE_REQUESTED" | "NEEDS_REVIEW";

export type Decision = {
  outcome: Outcome;
  /** Machine-readable reasons, mapped to icons and voice prompts in the UI. */
  reasons: Reason[];
};

export type Reason =
  | "UNREADABLE"
  | "LR_MISSING"
  | "LR_MISMATCH"
  | "STAMP_MISSING"
  | "SIGNATURE_MISSING"
  | "SHORTAGE_OR_DAMAGE"
  | "LOW_CONFIDENCE"
  | "RETAKES_EXHAUSTED"
  | "AI_UNAVAILABLE";

const REMARK_PATTERN = /short|shortage|damag|broken|leak|wet|torn|missing|कम|टूट|खराब|नुकसान|तूट|कमी/i;

export function hasShortageOrDamage(remarks: string | null): boolean {
  return !!remarks && REMARK_PATTERN.test(remarks);
}

const norm = (s: string) => s.replace(/[\s\-_/]/g, "").toUpperCase();

export function decide(
  ex: Extracted,
  confidence: number,
  expectedLr: string,
  retakesUsed: number,
): Decision {
  const photoProblems: Reason[] = [];
  if (!ex.readable) photoProblems.push("UNREADABLE");
  else {
    if (!ex.lr) photoProblems.push("LR_MISSING");
    else if (norm(ex.lr) !== norm(expectedLr)) photoProblems.push("LR_MISMATCH");
    if (!ex.stamp) photoProblems.push("STAMP_MISSING");
    if (!ex.signature) photoProblems.push("SIGNATURE_MISSING");
  }

  if (photoProblems.length > 0) {
    if (retakesUsed < MAX_RETAKES) return { outcome: "RETAKE_REQUESTED", reasons: photoProblems };
    return { outcome: "NEEDS_REVIEW", reasons: [...photoProblems, "RETAKES_EXHAUSTED"] };
  }

  const reasons: Reason[] = [];
  if (hasShortageOrDamage(ex.remarks)) reasons.push("SHORTAGE_OR_DAMAGE");
  if (confidence < CONFIDENCE_THRESHOLD) reasons.push("LOW_CONFIDENCE");
  if (reasons.length > 0) return { outcome: "NEEDS_REVIEW", reasons };

  return { outcome: "VERIFIED", reasons: [] };
}

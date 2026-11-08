import type { Extracted, Reason, Outcome } from "../podRules";
import { mockExtract } from "./mock";
import { anthropicExtract } from "./anthropic";
import { geminiExtract } from "./gemini";

export type Extraction = {
  extracted: Extracted;
  confidence: number;
  forcedOutcome?: Outcome;
  forcedReasons?: Reason[];
};

/** Throws if the provider fails. The caller turns that into "needs review", never a driver-facing error. */
export async function extractPod(image: Buffer, expectedLr: string): Promise<Extraction> {
  switch (process.env.AI_PROVIDER) {
    case "mock":
      return mockExtract(image, expectedLr);
    case "anthropic":
      return anthropicExtract(image);
    case "gemini":
      return geminiExtract(image);
    default:
      throw new Error(`Unsupported AI_PROVIDER: ${process.env.AI_PROVIDER ?? "(not set)"}`);
  }
}

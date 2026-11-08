import { afterEach, describe, expect, it, vi } from "vitest";
import { mockExtract } from "./mock";
import { extractPod } from "./index";

afterEach(() => vi.unstubAllEnvs());

describe("mock AI safety", () => {
  it("does not verify arbitrary photographs", () => {
    const result = mockExtract(Buffer.from("arbitrary photograph"), "LR-8823");
    expect(result.forcedOutcome).toBe("NEEDS_REVIEW");
    expect(result.forcedReasons).toEqual(["AI_UNAVAILABLE"]);
    expect(result.confidence).toBe(0);
  });

  it("supports an explicitly controlled verified fixture", () => {
    vi.stubEnv("MOCK_AI_FIXTURE", "verified");
    expect(mockExtract(Buffer.from("fixture"), "LR-8823").confidence).toBe(0.93);
  });

  it.each([
    ["missing-stamp", "stamp", false],
    ["missing-signature", "signature", false],
    ["low-confidence", "confidence", 0.6],
    ["shortage", "remarks", "Short by 4 bags"],
  ] as const)("supports the controlled %s fixture", (fixture, field, expected) => {
    vi.stubEnv("MOCK_AI_FIXTURE", fixture);
    const result = mockExtract(Buffer.from("fixture"), "LR-8823");
    const actual = field === "confidence"
      ? result.confidence
      : field === "stamp"
        ? result.extracted.stamp
        : field === "signature"
          ? result.extracted.signature
          : result.extracted.remarks;
    expect(actual).toBe(expected);
  });

  it("routes a controlled provider failure to the upload fallback", async () => {
    vi.stubEnv("AI_PROVIDER", "mock");
    vi.stubEnv("MOCK_AI_FIXTURE", "provider-failure");
    await expect(extractPod(Buffer.from("fixture"), "LR-8823")).rejects.toThrow("Controlled mock provider failure");
  });
});

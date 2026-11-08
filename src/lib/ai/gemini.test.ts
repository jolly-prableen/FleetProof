import { afterEach, describe, expect, it, vi } from "vitest";

const generateContent = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

import { geminiExtract, parseGeminiExtraction } from "./gemini";

const good = {
  readable: true,
  lr: "LR-8841",
  stamp: true,
  signature: true,
  quantity: "120 bags",
  date: "2026-11-08",
  shortage: false,
  damage: false,
  remarks: null,
  confidence: 0.92,
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  generateContent.mockReset();
});

describe("Gemini extraction", () => {
  it("parses structured JSON and maps quantity", () => {
    const result = parseGeminiExtraction(JSON.stringify(good));
    expect(result).toEqual({
      extracted: {
        readable: true,
        lr: "LR-8841",
        stamp: true,
        signature: true,
        qty: "120 bags",
        date: "2026-11-08",
        remarks: null,
      },
      confidence: 0.92,
    });
  });

  it("rejects invalid JSON", () => {
    expect(parseGeminiExtraction("{not-json}")).toBeNull();
  });

  it("rejects responses with missing required fields", () => {
    const { damage: _damage, ...missingField } = good;
    expect(parseGeminiExtraction(JSON.stringify(missingField))).toBeNull();
  });

  it("turns shortage and damage flags into reviewable remarks", () => {
    const result = parseGeminiExtraction(JSON.stringify({ ...good, shortage: true }));
    expect(result?.extracted.remarks).toBe("Shortage reported");
  });

  it("throws when the Gemini API fails", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    generateContent.mockRejectedValue(new Error("Gemini unavailable"));
    await expect(geminiExtract(Buffer.from("jpeg"))).rejects.toThrow("Gemini unavailable");
  });

  it("throws when Gemini returns no usable text", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    generateContent.mockResolvedValue({ text: JSON.stringify({ ...good, stamp: "unknown" }) });
    await expect(geminiExtract(Buffer.from("jpeg"))).rejects.toThrow("Gemini reply was not valid");
  });

  it("requires the server-side API key", async () => {
    await expect(geminiExtract(Buffer.from("jpeg"))).rejects.toThrow("GEMINI_API_KEY is not set");
    expect(generateContent).not.toHaveBeenCalled();
  });
});

import { z } from "zod";
import type { Extracted } from "../podRules";

const schema = z.object({
  readable: z.boolean(),
  lr: z.string().nullable(),
  stamp: z.boolean(),
  signature: z.boolean(),
  qty: z.string().nullable(),
  remarks: z.string().nullable(),
  date: z.string().nullable(),
  confidence: z.number().min(0).max(1),
});

const clip = (s: string | null) => (s === null ? null : s.slice(0, 200));

/** Pull the JSON object out of a model reply and validate it. Returns null if it is not usable. */
export function parseExtraction(text: string): { extracted: Extracted; confidence: number } | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
  const r = schema.safeParse(raw);
  if (!r.success) return null;
  const { confidence, ...rest } = r.data;
  return {
    confidence,
    extracted: { ...rest, lr: clip(rest.lr), qty: clip(rest.qty), remarks: clip(rest.remarks), date: clip(rest.date) },
  };
}

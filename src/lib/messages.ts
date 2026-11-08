import type { Reason } from "./podRules";

export type Lang = "hi" | "mr" | "en";

export function toLang(v: string): Lang {
  return v === "hi" || v === "mr" ? v : "en";
}

export const SPEECH_LOCALE: Record<Lang, string> = { hi: "hi-IN", mr: "mr-IN", en: "en-IN" };

/** Voice and on-screen prompts for drivers. Short, one idea each. */
export const PROMPTS: Record<Lang, { capture: string; checking: string; received: string; ok: string; retake: string; review: string; offline: string; retry: string; done: string; left: (n: number) => string }> = {
  hi: {
    capture: "पीओडी की फोटो लें", checking: "फोटो जाँची जा रही है", received: "फोटो जमा हो गई",
    ok: "ठीक है, फोटो मिल गई",
    retake: "फोटो साफ़ नहीं है, कृपया दोबारा लें",
    review: "फोटो जमा हो गई, ऑफिस जाँच करेगा",
    offline: "नेटवर्क नहीं है, फोटो सुरक्षित है",
    retry: "दोबारा फोटो लें",
    done: "हो गया",
    left: (n) => `फोटो के बचे मौके: ${n}`,
  },
  mr: {
    capture: "पीओडीचा फोटो घ्या", checking: "फोटो तपासला जात आहे", received: "फोटो जमा झाला",
    ok: "ठीक आहे, फोटो मिळाला",
    retake: "फोटो स्पष्ट नाही, कृपया पुन्हा घ्या",
    review: "फोटो जमा झाला, ऑफिस तपासेल",
    offline: "नेटवर्क नाही, फोटो सुरक्षित आहे",
    retry: "पुन्हा फोटो घ्या",
    done: "झाले",
    left: (n) => `फोटोच्या उरलेल्या संधी: ${n}`,
  },
  en: {
    capture: "Take a photo of the POD", checking: "Checking the photo", received: "Photo uploaded successfully",
    ok: "All good, photo received",
    retake: "The photo is not clear. Please take it again",
    review: "Photo received. The office will check it",
    offline: "No network. Your photo is saved",
    retry: "Take photo again",
    done: "Done",
    left: (n) => `${n} retake${n === 1 ? "" : "s"} left`,
  },
};

/** Plain-English reasons for billing staff and the trip's remarks column. */
export const REASON_TEXT: Record<Reason, string> = {
  UNREADABLE: "Photo not readable",
  LR_MISSING: "LR number not found",
  LR_MISMATCH: "LR number does not match the trip",
  STAMP_MISSING: "Consignee stamp not visible",
  SIGNATURE_MISSING: "Signature missing",
  SHORTAGE_OR_DAMAGE: "Shortage or damage remark",
  LOW_CONFIDENCE: "AI is not confident",
  RETAKES_EXHAUSTED: "Two retakes used",
  AI_UNAVAILABLE: "AI check unavailable",
};

export function speak(text: string, lang: Lang) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = SPEECH_LOCALE[lang];
    window.speechSynthesis.speak(u);
  } catch {
    /* voice is a help, never a blocker */
  }
}

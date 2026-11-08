"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { compressImage } from "@/lib/client/compress";
import { enqueue } from "@/lib/client/offlineQueue";
import { newId, RejectedError, RetryableError, uploadPod, type UploadItem, type UploadResult } from "@/lib/client/uploadPod";
import { PROMPTS, speak, type Lang } from "@/lib/messages";

type Props = {
  trip: { id: string; destination: string; vehicle: string; lrNumber: string };
  lang: Lang;
  retakesLeft: number;
  endpoint?: string;
  token?: string;
};

type Phase =
  | { name: "ready" }
  | { name: "working" }
  | { name: "result"; result: UploadResult }
  | { name: "queued" }
  | { name: "error"; message: string };

function getPosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => resolve(null), // GPS is a bonus stamp, never a blocker
      { enableHighAccuracy: true, timeout: 4000, maximumAge: 60_000 },
    );
  });
}

export function CaptureClient({ trip, lang, retakesLeft, endpoint, token }: Props) {
  const t = PROMPTS[lang];
  const input = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<Phase>({ name: "ready" });

  useEffect(() => {
    if (phase.name === "ready") speak(t.capture, lang);
  }, [phase.name, lang, t.capture]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setPhase({ name: "working" });
    speak(t.checking, lang);

    try {
      const capturedAt = new Date().toISOString(); // stamped at the moment of capture
      const [blob, pos] = await Promise.all([compressImage(file), getPosition()]);
      const item: UploadItem = {
        clientId: newId(), tripId: trip.id, blob,
        lat: pos?.lat ?? null, lng: pos?.lng ?? null, capturedAt,
        endpoint, token,
      };
      try {
        const result = await uploadPod(item);
        setPhase({ name: "result", result });
        speak(result.outcome === "VERIFIED" ? t.ok : result.outcome === "RETAKE_REQUESTED" ? t.retake : t.review, lang);
      } catch (err) {
        if (err instanceof RetryableError) {
          await enqueue(item); // dead zone: keep the photo on the phone and send later
          setPhase({ name: "queued" });
          speak(t.offline, lang);
        } else if (err instanceof RejectedError) {
          setPhase({ name: "error", message: err.message });
        } else throw err;
      }
    } catch {
      setPhase({ name: "error", message: "Something went wrong with the photo. Please try again." });
    }
  }

  const pick = () => input.current?.click();

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-8 pt-6">
      <Link href="/driver" className="text-sm font-semibold text-ink-soft">Back</Link>
      <header className="mt-4">
        <h1 className="text-3xl font-bold">{trip.destination}</h1>
        <p className="text-ink-soft">{trip.vehicle} · {trip.lrNumber}</p>
      </header>

      <input ref={input} type="file" accept="image/*" capture="environment" onChange={onPick} className="sr-only" tabIndex={-1} aria-hidden />

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        {phase.name === "ready" && (
          <>
            <button
              onClick={pick}
              aria-label={t.capture}
              className="flex h-56 w-56 items-center justify-center rounded-full bg-brand text-8xl text-white shadow-lg transition-transform active:scale-95"
            >
              <span aria-hidden>📷</span>
            </button>
            <p className="mt-8 text-2xl font-bold">{t.capture}</p>
            <button onClick={() => speak(t.capture, lang)} className="mt-3 text-sm font-semibold text-ink-soft underline-offset-4 hover:underline">
              🔊 Play voice
            </button>
          </>
        )}

        {phase.name === "working" && (
          <div role="status" aria-live="polite">
            <div className="mx-auto h-20 w-20 animate-spin rounded-full border-8 border-line border-t-brand" />
            <p className="mt-8 text-2xl font-bold">{t.checking}</p>
          </div>
        )}

        {phase.name === "result" && <ResultView result={phase.result} t={t} onRetry={pick} />}

        {phase.name === "queued" && (
          <div role="status">
            <div aria-hidden className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-review-bg text-7xl text-review">⏳</div>
            <p className="mt-8 text-2xl font-bold">{t.offline}</p>
            <Link href="/driver" className="mt-8 inline-block rounded-xl2 bg-brand px-10 py-4 text-xl font-bold text-white">{t.done}</Link>
          </div>
        )}

        {phase.name === "error" && (
          <div role="alert">
            <p className="rounded-xl2 bg-warn-bg px-5 py-4 text-warn">{phase.message}</p>
            <button onClick={() => setPhase({ name: "ready" })} className="mt-6 rounded-xl2 bg-brand px-10 py-4 text-xl font-bold text-white">{t.retry}</button>
          </div>
        )}
      </div>

      {phase.name === "ready" && retakesLeft < 2 && (
        <p className="text-center text-sm text-ink-soft">{t.left(retakesLeft)}</p>
      )}
    </main>
  );
}

function ResultView({ result, t, onRetry }: { result: UploadResult; t: (typeof PROMPTS)["en"]; onRetry: () => void }) {
  const retake = result.outcome === "RETAKE_REQUESTED";
  const ok = result.outcome === "VERIFIED";
  const tone = ok ? "bg-ok-bg text-ok" : retake ? "bg-warn-bg text-warn" : "bg-review-bg text-review";
  const glyph = ok ? "✓" : retake ? "↺" : "…";
  const label = ok ? t.ok : retake ? t.retake : t.review;

  return (
    <div role="status" aria-live="polite">
      <div aria-hidden className={`mx-auto flex h-48 w-48 items-center justify-center rounded-full text-8xl font-bold ${tone}`}>{glyph}</div>
      <p className="mt-4 text-sm font-semibold text-ink-soft">{t.received}</p>
      <p className="mt-8 text-2xl font-bold">{label}</p>
      {retake ? (
        <button onClick={onRetry} className="mt-8 rounded-xl2 bg-warn px-10 py-4 text-xl font-bold text-white">
          📷 {t.retry}
        </button>
      ) : (
        <Link href="/driver" className="mt-8 inline-block rounded-xl2 bg-brand px-10 py-4 text-xl font-bold text-white">{t.done}</Link>
      )}
      {retake && <p className="mt-4 text-sm text-ink-soft">{t.left(result.retakesLeft)}</p>}
    </div>
  );
}

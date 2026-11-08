"use client";

import { useState } from "react";
import { CaptureClient } from "./CaptureClient";
import type { Lang } from "@/lib/messages";

type Props = {
  trip: { id: string; destination: string; vehicle: string; lrNumber: string };
  token: string;
  retakesLeft: number;
};

export function HiredLanguagePicker({ trip, token, retakesLeft }: Props) {
  const [lang, setLang] = useState<Lang | null>(null);
  if (lang) return <CaptureClient trip={trip} lang={lang} retakesLeft={retakesLeft} endpoint="/api/pods/token" token={token} />;
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand">POD upload</p>
      <h1 className="mt-3 text-3xl font-bold">Choose your language</h1>
      <p className="mt-3 text-ink-soft">{trip.destination} · {trip.vehicle}</p>
      <div className="mt-10 grid grid-cols-2 gap-4">
        <button onClick={() => setLang("hi")} className="rounded-xl2 bg-brand px-5 py-6 text-2xl font-bold text-white">हिंदी</button>
        <button onClick={() => setLang("mr")} className="rounded-xl2 bg-brand px-5 py-6 text-2xl font-bold text-white">मराठी</button>
      </div>
    </main>
  );
}

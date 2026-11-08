"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { BrandMark } from "@/components/BrandMark";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) setError("Email or password is wrong. Check and try again.");
    else router.replace("/");
  }

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-brand px-12 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full border-[48px] border-white/10" />
        <div className="absolute -bottom-48 -left-24 h-96 w-96 rounded-full border-[48px] border-white/10" />
        <BrandMark />
        <div className="relative max-w-lg">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/60">Delivery operations</p>
          <h1 className="mt-5 text-6xl font-bold leading-[0.95] tracking-tight">The last mile, made visible.</h1>
          <p className="mt-7 max-w-md text-lg leading-relaxed text-white/70">Capture proof once. Let the office verify it, bill it, and keep every trip moving.</p>
        </div>
        <p className="relative text-sm text-white/50">POD Desk · built for the road and the back office</p>
      </section>

      <section className="flex items-center justify-center px-6 py-10 sm:px-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden"><BrandMark /></div>
          <p className="mt-10 text-sm font-bold uppercase tracking-[0.16em] text-brand lg:mt-0">Welcome back</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight">Sign in to POD Desk</h2>
          <p className="mt-2 text-ink-soft">Capture or bill proof of delivery.</p>

          <form onSubmit={submit} className="mt-8 space-y-4" noValidate>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Email</span>
              <input
                type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-line bg-white px-4 py-3.5 text-base shadow-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold">Password</span>
              <input
                type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-line bg-white px-4 py-3.5 text-base shadow-sm"
              />
            </label>
            {error && <p role="alert" className="rounded-xl bg-warn-bg px-4 py-3 text-sm text-warn">{error}</p>}
            <button
              type="submit" disabled={busy}
              className="w-full rounded-xl bg-brand px-4 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-brand-dark disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Continue"}
            </button>
          </form>

          <div className="mt-8 rounded-2xl border border-line bg-white p-4 text-sm text-ink-soft shadow-sm">
            <p className="font-semibold text-ink">Demo access</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <span><b className="block text-ink">Driver</b>driver@demo.test</span>
              <span><b className="block text-ink">Billing</b>billing@demo.test</span>
            </div>
            <p className="mt-3 border-t border-line pt-3 text-xs">Both accounts use password <b>demo1234</b></p>
          </div>
        </div>
      </section>
    </main>
  );
}

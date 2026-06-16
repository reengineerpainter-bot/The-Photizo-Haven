"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface MfaSetupData {
  qrDataUrl: string;
  secret: string;
  email: string;
  fullName: string;
}

export function MfaSetupScreen() {
  const router = useRouter();
  const [setup, setSetup] = useState<MfaSetupData | null>(null);
  const [code, setCode] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const loadSetup = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/mfa/setup");
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 400 && data.error?.includes("already enabled")) {
          router.replace("/dashboard");
          return;
        }
        throw new Error(data.error ?? "Failed to load MFA setup");
      }
      setSetup(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load setup");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadSetup();
  }, [loadSetup]);

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setVerifying(true);

    const res = await fetch("/api/auth/mfa/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const data = await res.json();
    setVerifying(false);

    if (!res.ok) {
      setError(data.error ?? "Verification failed");
      return;
    }

    router.push(data.role === "MEMBER" ? "/dashboard" : "/admin");
  }

  async function copySecret() {
    if (!setup?.secret) return;
    await navigator.clipboard.writeText(setup.secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="glass-card w-full max-w-md p-8 text-center text-haven-muted">
        Preparing your security setup...
      </div>
    );
  }

  if (error && !setup) {
    return (
      <div className="glass-card w-full max-w-md p-8 text-center">
        <p className="text-red-400">{error}</p>
        <button type="button" onClick={loadSetup} className="btn-ghost mt-4">
          Retry
        </button>
      </div>
    );
  }

  if (!setup) return null;

  return (
    <div className="glass-card glow-border w-full max-w-md p-8">
      <p className="mb-1 text-sm uppercase tracking-widest text-haven-cyan">Security setup</p>
      <h1 className="mb-2 text-2xl font-bold">Enable two-factor auth</h1>
      <p className="mb-6 text-sm text-haven-muted">
        Scan the QR code with Google Authenticator, Authy, or any TOTP app for{" "}
        <span className="text-white/80">{setup.email}</span>.
      </p>

      <div className="mb-6 flex justify-center">
        <div className="rounded-2xl bg-white p-4 shadow-glow">
          <img
            src={setup.qrDataUrl}
            alt="MFA QR code"
            width={200}
            height={200}
            className="rounded-lg"
          />
        </div>
      </div>

      <div className="mb-6">
        <button
          type="button"
          onClick={() => setShowSecret((v) => !v)}
          className="text-xs font-medium text-haven-cyan hover:underline"
        >
          {showSecret ? "Hide manual key" : "Can't scan? Enter key manually"}
        </button>
        {showSecret && (
          <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="mb-2 text-xs text-haven-muted">Setup key</p>
            <code className="block break-all text-sm text-haven-emerald">{setup.secret}</code>
            <button
              type="button"
              onClick={copySecret}
              className="mt-2 text-xs text-haven-cyan hover:underline"
            >
              {copied ? "Copied!" : "Copy key"}
            </button>
          </div>
        )}
      </div>

      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label htmlFor="mfa-code" className="mb-1 block text-sm text-haven-muted">
            Enter the 6-digit code from your app
          </label>
          <input
            id="mfa-code"
            className="input-field text-center text-lg tracking-[0.3em]"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
            required
          />
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <button
          type="submit"
          className="btn-primary w-full"
          disabled={verifying || code.length !== 6}
        >
          {verifying ? "Verifying..." : "Verify & continue"}
        </button>
      </form>
    </div>
  );
}

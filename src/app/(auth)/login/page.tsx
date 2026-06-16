"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [mfaRequired, setMfaRequired] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload: Record<string, string> = {
      email: form.get("email") as string,
      password: form.get("password") as string,
    };
    const mfaCode = form.get("mfaCode") as string;
    if (mfaCode) payload.mfaCode = mfaCode;

    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (data.mfaSetupRequired) {
      router.push("/mfa/setup");
      return;
    }

    if (data.mfaRequired) {
      setMfaRequired(true);
      return;
    }

    if (!res.ok) {
      setError(data.error ?? "Login failed");
      return;
    }

    router.push(data.role === "MEMBER" ? "/dashboard" : "/admin");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-card w-full max-w-md p-8">
        <h1 className="mb-6 text-2xl font-bold">Welcome back</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="email" type="email" className="input-field" placeholder="Email" required />
          <input
            name="password"
            type="password"
            className="input-field"
            placeholder="Password"
            required
          />
          {mfaRequired && (
            <input
              name="mfaCode"
              className="input-field"
              placeholder="6-digit MFA code"
              maxLength={6}
              required
            />
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-haven-muted">
          New here?{" "}
          <Link href="/signup" className="text-haven-cyan hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}

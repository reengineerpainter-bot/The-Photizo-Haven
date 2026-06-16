"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const payload = {
      fullName: form.get("fullName"),
      phone: form.get("phone"),
      email: form.get("email"),
      dateJoined: form.get("dateJoined"),
      password: form.get("password"),
    };

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Signup failed");
      return;
    }

    router.push("/mfa/setup");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="glass-card w-full max-w-md p-8">
        <h1 className="mb-1 text-2xl font-bold">Create account</h1>
        <p className="mb-6 text-sm text-haven-muted">
          Secure onboarding with MFA enabled by default
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="fullName" className="input-field" placeholder="Full name" required />
          <input name="phone" className="input-field" placeholder="+233..." required />
          <input name="email" type="email" className="input-field" placeholder="Email" required />
          <input name="dateJoined" type="date" className="input-field" required />
          <input
            name="password"
            type="password"
            className="input-field"
            placeholder="Password (12+ chars, mixed case, symbol)"
            minLength={12}
            required
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Creating..." : "Sign up"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-haven-muted">
          Already a member?{" "}
          <Link href="/login" className="text-haven-cyan hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

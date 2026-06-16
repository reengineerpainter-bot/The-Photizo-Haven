import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="glass-card glow-border max-w-lg p-10 text-center">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-haven-cyan">
          The Photizo Haven
        </p>
        <h1 className="mb-4 text-4xl font-bold tracking-tight">
          Track giving.{" "}
          <span className="bg-gradient-to-r from-haven-cyan to-haven-emerald bg-clip-text text-transparent">
            Grow together.
          </span>
        </h1>
        <p className="mb-8 text-haven-muted">
          A secure, futuristic platform for managing Tithe, PCO Seed, Haven Dues,
          Welfare, and Local Partnership contributions.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link href="/signup" className="btn-primary">
            Join the Haven
          </Link>
          <Link href="/login" className="btn-ghost">
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}

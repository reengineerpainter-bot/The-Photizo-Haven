"use client";

import { useCallback, useEffect, useState } from "react";
import { GIVING_CATEGORIES } from "@/types";
import type { GivingSummary } from "@/types/giving";
import { recordForCategory, targetForCategory } from "@/lib/giving/utils";
import { GivingTracker } from "./GivingTracker";

export function GivingDashboard() {
  const [summary, setSummary] = useState<GivingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await fetch("/api/giving");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to load giving data");
      }
      const data: GivingSummary = await res.json();
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="glass-card p-8 text-center text-haven-muted">
        Loading your giving data...
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card p-8 text-center">
        <p className="text-red-400">{error}</p>
        <button type="button" onClick={load} className="btn-ghost mt-4">
          Retry
        </button>
      </div>
    );
  }

  if (!summary) return null;

  const monthLabel = new Date(summary.periodMonth).toLocaleDateString("en-GH", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <p className="mb-4 text-sm text-haven-muted">
        Showing <span className="text-white/80">{monthLabel}</span> contributions
      </p>
      <div className="space-y-4">
        {GIVING_CATEGORIES.map((cat) => (
          <GivingTracker
            key={cat.key}
            category={cat}
            periodMonth={summary.periodMonth}
            record={recordForCategory(summary.records, cat.key, summary.periodMonth)}
            target={targetForCategory(summary.targets, cat.key)}
            activeProject={
              cat.key === "LOCAL_PARTNERSHIP" ? summary.activeProject : undefined
            }
            onSaved={load}
          />
        ))}
      </div>
    </>
  );
}

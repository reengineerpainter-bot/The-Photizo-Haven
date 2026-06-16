"use client";

import { useState } from "react";
import { currentPeriodMonth } from "@/lib/giving/utils";

interface Props {
  scope: "individual" | "group";
  memberId?: string;
  label?: string;
  className?: string;
}

function toMonthInputValue(periodMonth: string): string {
  return periodMonth.slice(0, 7);
}

export function MonthlyReportDownload({
  scope,
  memberId,
  label,
  className = "",
}: Props) {
  const [period, setPeriod] = useState(toMonthInputValue(currentPeriodMonth()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDownload() {
    setError("");
    setLoading(true);

    try {
      const params = new URLSearchParams({
        period,
        scope,
      });
      if (memberId) params.set("memberId", memberId);

      const res = await fetch(`/api/reports/monthly?${params.toString()}`);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Download failed");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename="(.+)"/);
      const filename = match?.[1] ?? `photizo-report-${period}.pdf`;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={`glass-card p-5 ${className}`}>
      <h3 className="font-semibold">
        {label ?? (scope === "group" ? "Group monthly report" : "My monthly report")}
      </h3>
      <p className="mt-1 text-xs text-haven-muted">
        Download a PDF summary of giving progress for the selected month.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label htmlFor={`period-${scope}-${memberId ?? "self"}`} className="mb-1 block text-xs text-haven-muted">
            Report month
          </label>
          <input
            id={`period-${scope}-${memberId ?? "self"}`}
            type="month"
            className="input-field"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          />
        </div>
        <button
          type="button"
          onClick={handleDownload}
          disabled={loading}
          className="btn-primary whitespace-nowrap sm:mb-0"
        >
          {loading ? "Generating..." : "Download PDF"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}

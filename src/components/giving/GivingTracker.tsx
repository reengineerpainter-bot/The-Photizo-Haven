"use client";

import { useEffect, useState } from "react";
import type { GivingCategory } from "@/types";
import type { GivingRecordDto, GivingTargetDto, PartnershipProjectDto } from "@/types/giving";
import { computeProgress, formatCurrency } from "@/lib/giving/utils";

interface CategoryMeta {
  key: GivingCategory;
  label: string;
  description: string;
}

interface Props {
  category: CategoryMeta;
  periodMonth: string;
  record?: GivingRecordDto;
  target?: GivingTargetDto;
  activeProject?: PartnershipProjectDto | null;
  onSaved: () => void;
}

export function GivingTracker({
  category,
  periodMonth,
  record,
  target,
  activeProject,
  onSaved,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [amount, setAmount] = useState(record ? String(record.amount) : "");
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [projectDesc, setProjectDesc] = useState(record?.projectDesc ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const contributed = record?.amount ?? 0;
  const progress = computeProgress(contributed, target);

  useEffect(() => {
    setAmount(record ? String(record.amount) : "");
    setNotes(record?.notes ?? "");
    setProjectDesc(record?.projectDesc ?? "");
  }, [record]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const payload: Record<string, unknown> = {
      category: category.key,
      amount: parseFloat(amount),
      periodMonth,
      notes: notes || undefined,
    };

    if (category.key === "LOCAL_PARTNERSHIP") {
      payload.projectDesc = projectDesc || activeProject?.description || undefined;
    }

    const res = await fetch("/api/giving", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to save");
      return;
    }

    setExpanded(false);
    onSaved();
  }

  return (
    <div className="glass-card p-5 transition hover:border-haven-cyan/20">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{category.label}</h3>
          <p className="text-xs text-haven-muted">{category.description}</p>
        </div>
        <div className="text-right">
          {progress !== null ? (
            <span className="rounded-full bg-haven-cyan/10 px-2 py-0.5 text-xs text-haven-cyan">
              {progress}%
            </span>
          ) : (
            <span className="text-xs text-haven-muted">No goal</span>
          )}
          <p className="mt-1 text-sm font-medium text-haven-emerald">
            {formatCurrency(contributed, record?.currency ?? "GHS")}
          </p>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-haven-cyan to-haven-emerald transition-all duration-700"
          style={{ width: `${progress ?? (contributed > 0 ? 100 : 0)}%` }}
        />
      </div>

      {target && (
        <p className="mt-2 text-xs text-haven-muted">
          Goal: {formatCurrency(target.targetAmount)}
          {target.isPercentage && target.percentage
            ? ` (${target.percentage}% mode)`
            : ""}
        </p>
      )}

      {category.key === "LOCAL_PARTNERSHIP" && (
        <p className="mt-3 text-xs text-haven-muted">
          Active project:{" "}
          <span className="text-white/80">
            {activeProject?.title ?? record?.projectDesc ?? "No project set this month"}
          </span>
          {activeProject?.description && !record?.projectDesc && (
            <span className="mt-1 block text-white/60">{activeProject.description}</span>
          )}
        </p>
      )}

      {record?.recordedAt && (
        <p className="mt-2 text-xs text-haven-muted">
          Last updated {new Date(record.recordedAt).toLocaleDateString()}
        </p>
      )}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="mt-3 text-xs font-medium text-haven-cyan hover:underline"
      >
        {expanded ? "Cancel" : record ? "Update giving" : "Log giving"}
      </button>

      {expanded && (
        <form onSubmit={handleSubmit} className="mt-4 space-y-3 border-t border-white/10 pt-4">
          <input
            type="number"
            step="0.01"
            min="0.01"
            className="input-field"
            placeholder="Amount (GHS)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
          <input
            className="input-field"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
          />
          {category.key === "LOCAL_PARTNERSHIP" && (
            <input
              className="input-field"
              placeholder="Project description (optional)"
              value={projectDesc}
              onChange={(e) => setProjectDesc(e.target.value)}
              maxLength={1000}
            />
          )}
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
        </form>
      )}
    </div>
  );
}

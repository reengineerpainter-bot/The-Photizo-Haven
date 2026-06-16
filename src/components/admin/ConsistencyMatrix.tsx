"use client";

import { useEffect, useState } from "react";
import type { ConsistencyStatus } from "@/types";

interface MemberRow {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  consistency: ConsistencyStatus;
  lastGivingAt: string | null;
}

const STATUS_COLORS: Record<ConsistencyStatus, string> = {
  OUTSTANDING: "bg-haven-emerald shadow-glow-emerald",
  CONSISTENT: "bg-haven-cyan/80",
  LAGGING: "bg-amber-500/80",
  LAPSED: "bg-red-500/60",
};

export function ConsistencyMatrix() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/members")
      .then((r) => r.json())
      .then((d) => {
        setMembers(d.members ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="glass-card p-8 text-center text-haven-muted">Loading matrix...</div>;
  }

  return (
    <div className="glass-card overflow-hidden">
      <div className="border-b border-white/10 px-6 py-4">
        <h2 className="font-semibold">Consistency Matrix</h2>
        <div className="mt-2 flex flex-wrap gap-3 text-xs text-haven-muted">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <span key={status} className="flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded-sm ${color}`} />
              {status}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-white/5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {members.map((m) => (
          <button
            key={m.id}
            className="group bg-haven-surface p-4 text-left transition hover:bg-white/5"
          >
            <div
              className={`mb-2 h-8 w-8 rounded-lg ${STATUS_COLORS[m.consistency]}`}
              title={m.consistency}
            />
            <p className="truncate text-sm font-medium group-hover:text-haven-cyan">
              {m.fullName}
            </p>
            <p className="truncate text-xs text-haven-muted">{m.email}</p>
          </button>
        ))}
      </div>

      {members.length === 0 && (
        <p className="p-8 text-center text-haven-muted">No members in this group yet.</p>
      )}
    </div>
  );
}

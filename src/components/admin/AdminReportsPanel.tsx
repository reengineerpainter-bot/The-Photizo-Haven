"use client";

import { useEffect, useState } from "react";
import { MonthlyReportDownload } from "@/components/reports/MonthlyReportDownload";

interface MemberOption {
  id: string;
  fullName: string;
}

export function AdminReportsPanel() {
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");

  useEffect(() => {
    fetch("/api/admin/members")
      .then((r) => r.json())
      .then((d) => {
        const list = (d.members ?? []).map((m: MemberOption) => ({
          id: m.id,
          fullName: m.fullName,
        }));
        setMembers(list);
        if (list[0]) setSelectedMemberId(list[0].id);
      })
      .catch(() => {});
  }, []);

  return (
    <section className="mt-8 space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Monthly Reports</h2>
        <p className="text-sm text-haven-muted">
          Generate downloadable PDF reports for the group or individual members.
        </p>
      </div>

      <MonthlyReportDownload scope="group" />

      <div className="glass-card p-5">
        <h3 className="font-semibold">Individual member report</h3>
        <p className="mt-1 text-xs text-haven-muted">
          Select a member to download their personal monthly giving summary.
        </p>
        <div className="mt-4">
          <label htmlFor="member-select" className="mb-1 block text-xs text-haven-muted">
            Member
          </label>
          <select
            id="member-select"
            className="input-field"
            value={selectedMemberId}
            onChange={(e) => setSelectedMemberId(e.target.value)}
          >
            {members.length === 0 && <option value="">No members found</option>}
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </select>
        </div>
        {selectedMemberId && (
          <div className="mt-4 border-t border-white/10 pt-4">
            <MonthlyReportDownload
              scope="individual"
              memberId={selectedMemberId}
              label="Download selected member report"
              className="border-0 bg-transparent p-0 shadow-none"
            />
          </div>
        )}
      </div>
    </section>
  );
}

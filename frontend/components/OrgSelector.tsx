'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Building2, ChevronDown, Check } from 'lucide-react';

export interface OrgMemberInfo {
  id: string;
  org_id: string;
  role: 'owner' | 'editor' | 'viewer';
  organization: {
    id: string;
    name: string;
    quota_calls_allowed: number;
    quota_calls_used: number;
    org_usage_summary?: {
      avg_run_duration_seconds: number;
    };
  };
}

interface Props {
  memberships: OrgMemberInfo[];
  selectedOrgId: string;
  onSelectOrg: (orgId: string) => void;
}

export default function OrgSelector({ memberships, selectedOrgId, onSelectOrg }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const activeMembership = memberships.find((m) => m.org_id === selectedOrgId);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const roleColor = (role: string) => {
    if (role === 'owner') return 'text-purple-400';
    if (role === 'editor') return 'text-blue-400';
    return 'text-gray-400';
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 bg-[#161b22] hover:bg-[#1c2128] border border-[#30363d] hover:border-[#444c56] rounded-lg px-3 py-1.5 transition-all text-sm text-white cursor-pointer min-w-0 max-w-[260px]"
      >
        <Building2 className="w-4 h-4 text-blue-400 flex-shrink-0" />
        <span className="truncate font-medium">
          {activeMembership?.organization.name || 'Select Org'}
        </span>
        {activeMembership && (
          <span className={`text-xs font-semibold flex-shrink-0 ${roleColor(activeMembership.role)}`}>
            · {activeMembership.role}
          </span>
        )}
        <ChevronDown className={`w-3.5 h-3.5 text-gray-500 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-64 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
          <div className="p-1">
            {memberships.map((m) => (
              <button
                key={m.org_id}
                onClick={() => { onSelectOrg(m.org_id); setOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#21262d] transition-colors text-left cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-md bg-blue-500/10 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{m.organization.name}</p>
                  <p className={`text-xs capitalize ${roleColor(m.role)}`}>{m.role}</p>
                </div>
                {m.org_id === selectedOrgId && (
                  <Check className="w-4 h-4 text-blue-400 flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

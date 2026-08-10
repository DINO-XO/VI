'use client';

import React from 'react';
import { Activity, Clock } from 'lucide-react';

interface Props {
  quotaUsed: number;
  quotaAllowed: number;
  avgDurationSec?: number | null;
}

export default function QuotaWidget({ quotaUsed, quotaAllowed, avgDurationSec }: Props) {
  const percentage = Math.min(100, Math.round((quotaUsed / quotaAllowed) * 100));
  const isWarning = percentage >= 80;
  const isCritical = percentage >= 100;

  return (
    <div className="bg-nhost-card p-4 rounded-xl border border-nhost-border space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-nhost-blue" />
          <span className="text-sm font-semibold text-gray-200">Organization Quota</span>
        </div>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded ${
            isCritical
              ? 'bg-red-900/80 text-red-200'
              : isWarning
              ? 'bg-amber-900/80 text-amber-200'
              : 'bg-emerald-900/80 text-emerald-200'
          }`}
        >
          {quotaUsed} / {quotaAllowed} calls
        </span>
      </div>

      <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${
            isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-nhost-blue'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {avgDurationSec !== undefined && avgDurationSec !== null && (
        <div className="flex items-center space-x-1.5 text-xs text-gray-400">
          <Clock className="w-3.5 h-3.5" />
          <span>Avg Run Duration: <strong>{avgDurationSec}s</strong></span>
        </div>
      )}
    </div>
  );
}

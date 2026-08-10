'use client';

import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { APPROVE_STEP } from '../lib/graphql/mutations';
import { Check, Loader2, AlertCircle } from 'lucide-react';

interface Props {
  stepRunId: string;
  userRole: 'owner' | 'editor' | 'viewer';
  onSuccess: () => void;
}

export default function ApproveButton({ stepRunId, userRole, onSuccess }: Props) {
  const [approveStep, { loading }] = useMutation(APPROVE_STEP);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Hidden entirely for viewer role
  if (userRole === 'viewer') {
    return (
      <div className="text-xs text-amber-400 bg-amber-950/60 p-2 rounded border border-amber-800">
        Viewer role cannot approve steps. Only Organization Owners and Editors can approve.
      </div>
    );
  }

  const handleApprove = async () => {
    setErrorMsg(null);
    try {
      const res = await approveStep({
        variables: { step_run_id: stepRunId },
      });

      if (res.data?.approveStep?.success) {
        onSuccess();
      } else {
        setErrorMsg(res.data?.approveStep?.message || 'Approval failed');
      }
    } catch (err: any) {
      console.error('Approval Error:', err);
      setErrorMsg(err?.message || 'Forbidden: Approval request rejected by server');
    }
  };

  return (
    <div className="space-y-2">
      {errorMsg && (
        <div className="text-xs text-red-200 bg-red-950 p-2 rounded border border-red-800 flex items-center space-x-1.5">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <button
        onClick={handleApprove}
        disabled={loading}
        className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-lg text-sm transition-colors cursor-pointer disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Check className="w-4 h-4 stroke-[3]" />
        )}
        <span>Approve & Resume Workflow</span>
      </button>
    </div>
  );
}

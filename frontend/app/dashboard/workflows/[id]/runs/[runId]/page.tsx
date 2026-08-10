'use client';

import React from 'react';
import { useSubscription } from '@apollo/client';
import { SUBSCRIBE_STEP_RUN_STATUS } from '../../../../../../lib/graphql/subscriptions';
import StepCard, { StepRunItem } from '../../../../../../components/StepCard';
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { useOrg } from '../../../../../../lib/context/OrgContext';

export default function WorkflowRunPage({
  params,
}: {
  params: { id: string; runId: string };
}) {
  const workflowId = params.id;
  const runId = params.runId;
  const { activeMembership } = useOrg();
  const userRole = activeMembership?.role || 'viewer';

  const { data, loading, error, refetch } = useSubscription(
    SUBSCRIBE_STEP_RUN_STATUS,
    {
      variables: { workflow_run_id: runId },
      skip: !runId,
    }
  );

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center space-x-3">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-nhost-blue"></div>
        <span className="text-gray-400 text-sm">Connecting to live execution feed...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950/80 border border-red-800 text-red-200 p-6 rounded-xl space-y-2">
        <h3 className="font-bold">Subscription Error</h3>
        <p className="text-xs">{error.message}</p>
      </div>
    );
  }

  const stepRuns: StepRunItem[] = data?.step_runs || [];

  const isAnyPaused = stepRuns.some((s) => s.status === 'paused_awaiting_approval');
  const isAnyFailed = stepRuns.some((s) => s.status === 'failed');
  const isAllSucceeded =
    stepRuns.length > 0 && stepRuns.every((s) => s.status === 'succeeded');
  const isAnyRunning = stepRuns.some((s) => s.status === 'running');

  const overallStatus = isAnyPaused
    ? 'PAUSED (AWAITING APPROVAL)'
    : isAnyFailed
    ? 'FAILED'
    : isAllSucceeded
    ? 'COMPLETED'
    : isAnyRunning
    ? 'RUNNING'
    : 'PENDING';

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href={`/dashboard/workflows/${workflowId}`}
        className="inline-flex items-center space-x-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Workflow Builder</span>
      </Link>

      <div className="bg-nhost-card border border-nhost-border rounded-xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Live Workflow Run Execution</h1>
          <p className="text-xs text-gray-400 font-mono mt-1">Run ID: {runId}</p>
        </div>

        <div className="flex items-center space-x-2">
          <span
            className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center space-x-1.5 ${
              isAllSucceeded
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : isAnyFailed
                ? 'bg-red-950 text-red-300 border border-red-800'
                : isAnyPaused
                ? 'bg-amber-950 text-amber-300 border border-amber-500 font-bold animate-pulse'
                : 'bg-blue-950 text-blue-300 border border-blue-800'
            }`}
          >
            {isAllSucceeded && <CheckCircle2 className="w-4 h-4" />}
            {isAnyFailed && <XCircle className="w-4 h-4" />}
            {isAnyPaused && <AlertCircle className="w-4 h-4" />}
            {isAnyRunning && <RefreshCw className="w-4 h-4 animate-spin" />}
            <span>{overallStatus}</span>
          </span>
        </div>
      </div>

      {stepRuns.length === 0 ? (
        <div className="bg-nhost-card border border-nhost-border rounded-xl p-8 text-center text-gray-400">
          Initializing step executions...
        </div>
      ) : (
        <div className="space-y-4">
          {stepRuns.map((stepRun) => (
            <StepCard
              key={stepRun.id}
              stepRun={stepRun}
              userRole={userRole}
              onApproveSuccess={() => {
                if (refetch) refetch();
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import React from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_ORG_WORKFLOWS } from '../../lib/graphql/queries';
import { TRIGGER_WORKFLOW_RUN } from '../../lib/graphql/mutations';
import WorkflowList from '../../components/WorkflowList';
import { useOrg } from '../../lib/context/OrgContext';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const { selectedOrgId, activeMembership, refetchOrgs } = useOrg();
  const userRole = activeMembership?.role || 'viewer';

  const { data, loading, error, refetch } = useQuery(GET_ORG_WORKFLOWS, {
    variables: { org_id: selectedOrgId },
    skip: !selectedOrgId,
    fetchPolicy: 'network-only',
  });

  const [triggerWorkflowRun, { loading: isTriggering }] = useMutation(TRIGGER_WORKFLOW_RUN);

  const handleRunWorkflow = async (workflowId: string) => {
    try {
      const res = await triggerWorkflowRun({
        variables: { workflow_id: workflowId },
      });

      const runId = res.data?.triggerWorkflowRun?.run_id;
      if (runId) {
        refetchOrgs();
        refetch();
        router.push(`/dashboard/workflows/${workflowId}/runs/${runId}`);
      }
    } catch (err: any) {
      console.error('Trigger Workflow Error:', err);
      alert(`Error triggering workflow: ${err?.message || 'Unauthorized or quota exceeded'}`);
    }
  };

  if (!selectedOrgId || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-950/60 border border-red-800/60 text-red-300 p-6 rounded-xl space-y-3">
        <h3 className="font-bold text-lg">Error loading workflows</h3>
        <p className="text-sm font-mono text-red-200">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="bg-red-800 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const workflows = data?.workflows || [];

  return (
    <div className="space-y-6">
      <WorkflowList
        workflows={workflows}
        userRole={userRole}
        onRunWorkflow={handleRunWorkflow}
        isRunning={isTriggering}
      />
    </div>
  );
}

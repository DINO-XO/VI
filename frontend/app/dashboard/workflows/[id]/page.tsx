'use client';

import React from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { GET_WORKFLOW_BY_ID } from '../../../../lib/graphql/queries';
import {
  UPSERT_WORKFLOW_STEP_ACTION,
  CREATE_WORKFLOW_TRIGGER,
} from '../../../../lib/graphql/mutations';
import WorkflowBuilder, { StepItem } from '../../../../components/WorkflowBuilder';
import { useOrg } from '../../../../lib/context/OrgContext';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function WorkflowDetailPage() {
  const params = useParams();
  const workflowId = params?.id as string;

  const { activeMembership } = useOrg();
  const userRole = activeMembership?.role || 'viewer';

  const { data, loading, refetch } = useQuery(GET_WORKFLOW_BY_ID, {
    variables: { id: workflowId },
    skip: !workflowId,
  });

  const [upsertStep] = useMutation(UPSERT_WORKFLOW_STEP_ACTION);
  const [createTrigger] = useMutation(CREATE_WORKFLOW_TRIGGER);

  const handleSaveStep = async (step: StepItem): Promise<boolean> => {
    try {
      const res = await upsertStep({
        variables: {
          step: {
            id: step.id,
            workflow_id: workflowId,
            step_order: step.step_order,
            type: step.type,
            config: step.config,
          },
        },
      });

      if (res.data?.upsertWorkflowStep?.success) {
        refetch();
        return true;
      }
      return false;
    } catch (err: any) {
      console.error('Save step error:', err);
      return false;
    }
  };

  const handleAddWebhookTrigger = async (secret: string): Promise<boolean> => {
    try {
      await createTrigger({
        variables: {
          workflow_id: workflowId,
          type: 'webhook',
          config: { secret },
        },
      });
      refetch();
      return true;
    } catch (err: any) {
      console.error('Create trigger error:', err);
      return false;
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const workflow = data?.workflows_by_pk;

  if (!workflow) {
    return (
      <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-8 text-center text-gray-400">
        Workflow not found or access denied.
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center space-x-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Workflows</span>
      </Link>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-white">{workflow.name}</h1>
        {workflow.description && (
          <p className="text-sm text-gray-400">{workflow.description}</p>
        )}
      </div>

      <WorkflowBuilder
        workflowId={workflowId}
        initialSteps={workflow.workflow_steps || []}
        userRole={userRole}
        onSaveStep={handleSaveStep}
        onAddWebhookTrigger={handleAddWebhookTrigger}
        existingTriggers={workflow.workflow_triggers || []}
      />
    </div>
  );
}

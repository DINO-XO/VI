import type { Request, Response } from 'express';
import { hasuraAdminQuery } from './_lib/hasura-client.js';
import { runStepsFrom } from './_lib/step-runner.js';
import { OrgMember, StepRun, WorkflowStep } from './_lib/types.js';

export default async function handler(req: Request, res: Response) {
  try {
    const sessionVars = req.body?.session_variables || {};
    const userId = sessionVars['x-hasura-user-id'] || sessionVars['X-Hasura-User-Id'];
    const { step_run_id } = req.body?.input || {};

    if (!step_run_id) {
      return res.status(400).json({ success: false, message: 'step_run_id is required' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: missing user session' });
    }

    // 1. Fetch step_run, workflow_run, and workflow steps
    const stepRunData = await hasuraAdminQuery<{
      step_runs_by_pk: {
        id: string;
        status: string;
        workflow_step_id: string;
        workflow_run: {
          id: string;
          org_id: string;
          status: string;
          workflow: {
            workflow_steps: WorkflowStep[];
          };
        };
      };
    }>(
      `
      query GetStepRunForApproval($id: uuid!) {
        step_runs_by_pk(id: $id) {
          id
          status
          workflow_step_id
          workflow_run {
            id
            org_id
            status
            workflow {
              workflow_steps(order_by: { step_order: asc }) {
                id
                workflow_id
                step_order
                type
                config
              }
            }
          }
        }
      }
    `,
      { id: step_run_id }
    );

    const stepRun = stepRunData.step_runs_by_pk;
    if (!stepRun) {
      return res.status(404).json({ success: false, message: 'Step run not found' });
    }

    if (stepRun.status !== 'paused_awaiting_approval') {
      return res
        .status(400)
        .json({ success: false, message: `Step is in status '${stepRun.status}', not awaiting approval` });
    }

    const orgId = stepRun.workflow_run.org_id;

    // 2. LAYER 2 GATING: Check user role in org_members (Owner or Editor required!)
    const memberData = await hasuraAdminQuery<{ org_members: OrgMember[] }>(
      `
      query CheckApprovalRole($org_id: uuid!, $user_id: uuid!) {
        org_members(where: { org_id: { _eq: $org_id }, user_id: { _eq: $user_id } }) {
          role
        }
      }
    `,
      { org_id: orgId, user_id: userId }
    );

    const member = memberData.org_members[0];
    if (!member) {
      return res
        .status(403)
        .json({ success: false, message: 'Forbidden: You are not a member of this organization' });
    }

    if (member.role !== 'owner' && member.role !== 'editor') {
      return res
        .status(403)
        .json({ success: false, message: 'Forbidden: Only Owner or Editor can approve steps' });
    }

    // 3. Mark step approved & succeeded
    await hasuraAdminQuery(
      `
      mutation ApproveStepRun($id: uuid!, $user_id: uuid!, $now: timestamptz!, $run_id: uuid!) {
        update_step_runs_by_pk(
          pk_columns: { id: $id }
          _set: { status: "succeeded", approved_by: $user_id, approved_at: $now, finished_at: $now }
        ) {
          id
        }
        update_workflow_runs_by_pk(
          pk_columns: { id: $run_id }
          _set: { status: "running" }
        ) {
          id
        }
      }
    `,
      {
        id: step_run_id,
        user_id: userId,
        now: new Date().toISOString(),
        run_id: stepRun.workflow_run.id,
      }
    );

    // 4. Find next step index to resume
    const steps = stepRun.workflow_run.workflow.workflow_steps;
    const currentStepIdx = steps.findIndex((s) => s.id === stepRun.workflow_step_id);
    const nextStepIdx = currentStepIdx + 1;

    // 5. Resume workflow execution
    const execution = await runStepsFrom(
      stepRun.workflow_run.id,
      nextStepIdx,
      steps,
      orgId
    );

    return res.status(200).json({
      success: true,
      message: `Step approved. Workflow execution resumed: ${execution.message}`,
    });
  } catch (err: any) {
    console.error('[approveStep error]:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Internal server error' });
  }
}

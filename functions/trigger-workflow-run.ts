import type { Request, Response } from 'express';
import { hasuraAdminQuery } from './_lib/hasura-client.js';
import { runStepsFrom } from './_lib/step-runner.js';
import { OrgMember, WorkflowStep } from './_lib/types.js';

export default async function handler(req: Request, res: Response) {
  try {
    const sessionVars = req.body?.session_variables || {};
    const userId = sessionVars['x-hasura-user-id'] || sessionVars['X-Hasura-User-Id'];
    const { workflow_id } = req.body?.input || {};

    if (!workflow_id) {
      return res.status(400).json({ message: 'workflow_id is required' });
    }

    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized: missing user session' });
    }

    // 1. Fetch workflow and org details
    const wfData = await hasuraAdminQuery<{
      workflows_by_pk: {
        id: string;
        org_id: string;
        organization: {
          quota_calls_allowed: number;
          quota_calls_used: number;
        };
        workflow_steps: WorkflowStep[];
      };
    }>(
      `
      query GetWorkflowData($id: uuid!) {
        workflows_by_pk(id: $id) {
          id
          org_id
          organization {
            quota_calls_allowed
            quota_calls_used
          }
          workflow_steps(order_by: { step_order: asc }) {
            id
            workflow_id
            step_order
            type
            config
          }
        }
      }
    `,
      { id: workflow_id }
    );

    const workflow = wfData.workflows_by_pk;
    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' });
    }

    // 2. Validate membership & role (Layer 1 + Layer 2 rule)
    const memberData = await hasuraAdminQuery<{ org_members: OrgMember[] }>(
      `
      query CheckOrgMember($org_id: uuid!, $user_id: uuid!) {
        org_members(where: { org_id: { _eq: $org_id }, user_id: { _eq: $user_id } }) {
          role
        }
      }
    `,
      { org_id: workflow.org_id, user_id: userId }
    );

    const member = memberData.org_members[0];
    if (!member) {
      return res.status(403).json({ message: 'Forbidden: Not a member of this organization' });
    }

    if (member.role === 'viewer') {
      return res.status(403).json({ message: 'Forbidden: Viewer role cannot trigger workflow runs' });
    }

    // 3. Check Quota
    if (workflow.organization.quota_calls_used >= workflow.organization.quota_calls_allowed) {
      return res.status(400).json({ message: 'Quota exceeded: organization call limit reached' });
    }

    // 4. Create workflow_run
    const runData = await hasuraAdminQuery<{ insert_workflow_runs_one: { id: string } }>(
      `
      mutation CreateWorkflowRun($object: workflow_runs_insert_input!) {
        insert_workflow_runs_one(object: $object) {
          id
        }
      }
    `,
      {
        object: {
          workflow_id,
          org_id: workflow.org_id,
          status: 'running',
          trigger_type: 'manual',
          triggered_by: userId,
        },
      }
    );

    const runId = runData.insert_workflow_runs_one.id;

    // 5. Execute steps asynchronously or synchronously
    const execution = await runStepsFrom(
      runId,
      0,
      workflow.workflow_steps,
      workflow.org_id
    );

    return res.status(200).json({
      run_id: runId,
      status: execution.status,
      message: execution.message,
    });
  } catch (err: any) {
    console.error('[triggerWorkflowRun error]:', err);
    return res.status(500).json({ message: err?.message || 'Internal server error' });
  }
}

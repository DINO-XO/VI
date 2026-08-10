import type { Request, Response } from 'express';
import { hasuraAdminQuery } from './_lib/hasura-client.js';
import { runStepsFrom } from './_lib/step-runner.js';
import { WorkflowStep, WorkflowTrigger } from './_lib/types.js';

export default async function handler(req: Request, res: Response) {
  try {
    const { workflow_id, secret } = req.body?.input || {};

    if (!workflow_id || !secret) {
      return res.status(400).json({ message: 'workflow_id and secret are required' });
    }

    // 1. Fetch workflow trigger of type webhook
    const triggerData = await hasuraAdminQuery<{
      workflow_triggers: WorkflowTrigger[];
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
      query GetWebhookTrigger($workflow_id: uuid!) {
        workflow_triggers(
          where: { workflow_id: { _eq: $workflow_id }, type: { _eq: "webhook" }, is_active: { _eq: true } }
        ) {
          id
          config
        }
        workflows_by_pk(id: $workflow_id) {
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
      { workflow_id }
    );

    const trigger = triggerData.workflow_triggers[0];
    const workflow = triggerData.workflows_by_pk;

    if (!workflow || !trigger) {
      return res.status(404).json({ message: 'Active webhook trigger not found for this workflow' });
    }

    // 2. Validate secret
    const expectedSecret = trigger.config?.secret;
    if (!expectedSecret || expectedSecret !== secret) {
      return res.status(401).json({ message: 'Invalid webhook secret' });
    }

    // 3. Check Quota
    if (workflow.organization.quota_calls_used >= workflow.organization.quota_calls_allowed) {
      return res.status(400).json({ message: 'Quota exceeded: organization call limit reached' });
    }

    // 4. Create workflow_run
    const runData = await hasuraAdminQuery<{ insert_workflow_runs_one: { id: string } }>(
      `
      mutation CreateWebhookWorkflowRun($object: workflow_runs_insert_input!) {
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
          trigger_type: 'webhook',
          triggered_by: null,
        },
      }
    );

    const runId = runData.insert_workflow_runs_one.id;

    // 5. Execute steps
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
    console.error('[triggerWorkflowRunViaWebhook error]:', err);
    return res.status(500).json({ message: err?.message || 'Internal server error' });
  }
}

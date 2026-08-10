import type { Request, Response } from 'express';
import { hasuraAdminQuery } from './_lib/hasura-client.js';
import { OrgMember } from './_lib/types.js';

export default async function handler(req: Request, res: Response) {
  try {
    const sessionVars = req.body?.session_variables || {};
    const userId = sessionVars['x-hasura-user-id'] || sessionVars['X-Hasura-User-Id'];
    const { step } = req.body?.input || {};

    if (!step || !step.workflow_id || !step.type) {
      return res.status(400).json({ success: false, message: 'step object with workflow_id and type is required' });
    }

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized: missing user session' });
    }

    // 1. Fetch workflow org
    const wfData = await hasuraAdminQuery<{ workflows_by_pk: { org_id: string } }>(
      `
      query GetStepWorkflowOrg($id: uuid!) {
        workflows_by_pk(id: $id) {
          org_id
        }
      }
    `,
      { id: step.workflow_id }
    );

    const workflow = wfData.workflows_by_pk;
    if (!workflow) {
      return res.status(404).json({ success: false, message: 'Workflow not found' });
    }

    // 2. Fetch user's role in org_members
    const memberData = await hasuraAdminQuery<{ org_members: OrgMember[] }>(
      `
      query CheckStepUpsertRole($org_id: uuid!, $user_id: uuid!) {
        org_members(where: { org_id: { _eq: $org_id }, user_id: { _eq: $user_id } }) {
          role
        }
      }
    `,
      { org_id: workflow.org_id, user_id: userId }
    );

    const member = memberData.org_members[0];
    if (!member) {
      return res.status(403).json({ success: false, message: 'Forbidden: Not a member of this organization' });
    }

    if (member.role === 'viewer') {
      return res.status(403).json({ success: false, message: 'Forbidden: Viewers cannot create or edit steps' });
    }

    // LAYER 2 GATING: db_write and notify require owner role!
    if ((step.type === 'db_write' || step.type === 'notify') && member.role !== 'owner') {
      return res.status(403).json({
        success: false,
        message: `Forbidden: Only organization Owners can add/modify '${step.type}' step types`,
      });
    }

    // 3. Upsert workflow_step via admin client
    const upsertData = await hasuraAdminQuery<{
      insert_workflow_steps_one: { id: string };
    }>(
      `
      mutation UpsertStep($object: workflow_steps_insert_input!) {
        insert_workflow_steps_one(
          object: $object
          on_conflict: {
            constraint: workflow_steps_workflow_id_step_order_key
            update_columns: [type, config]
          }
        ) {
          id
        }
      }
    `,
      {
        object: {
          id: step.id || undefined,
          workflow_id: step.workflow_id,
          step_order: step.step_order,
          type: step.type,
          config: step.config || {},
        },
      }
    );

    return res.status(200).json({
      step_id: upsertData.insert_workflow_steps_one.id,
      success: true,
    });
  } catch (err: any) {
    console.error('[upsertWorkflowStep error]:', err);
    return res.status(500).json({ success: false, message: err?.message || 'Internal server error' });
  }
}

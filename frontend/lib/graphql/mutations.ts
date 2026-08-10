import { gql } from '@apollo/client';

export const CREATE_WORKFLOW = gql`
  mutation CreateWorkflow($org_id: uuid!, $name: String!, $description: String, $created_by: uuid!) {
    insert_workflows_one(
      object: { org_id: $org_id, name: $name, description: $description, created_by: $created_by }
    ) {
      id
      name
    }
  }
`;

export const UPSERT_WORKFLOW_STEP_ACTION = gql`
  mutation UpsertWorkflowStepAction($step: WorkflowStepInput!) {
    upsertWorkflowStep(step: $step) {
      step_id
      success
    }
  }
`;

export const DELETE_WORKFLOW_STEP = gql`
  mutation DeleteWorkflowStep($id: uuid!) {
    delete_workflow_steps_by_pk(id: $id) {
      id
    }
  }
`;

export const CREATE_WORKFLOW_TRIGGER = gql`
  mutation CreateWorkflowTrigger($workflow_id: uuid!, $type: String!, $config: jsonb!) {
    insert_workflow_triggers_one(
      object: { workflow_id: $workflow_id, type: $type, config: $config }
    ) {
      id
      type
      config
    }
  }
`;

export const TRIGGER_WORKFLOW_RUN = gql`
  mutation TriggerWorkflowRun($workflow_id: uuid!) {
    triggerWorkflowRun(workflow_id: $workflow_id) {
      run_id
      status
      message
    }
  }
`;

export const APPROVE_STEP = gql`
  mutation ApproveStep($step_run_id: uuid!) {
    approveStep(step_run_id: $step_run_id) {
      success
      message
    }
  }
`;

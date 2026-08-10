import { gql } from '@apollo/client';

export const SUBSCRIBE_STEP_RUN_STATUS = gql`
  subscription StepRunStatus($workflow_run_id: uuid!) {
    step_runs(
      where: { workflow_run_id: { _eq: $workflow_run_id } }
      order_by: { workflow_step: { step_order: asc } }
    ) {
      id
      workflow_run_id
      workflow_step_id
      status
      input
      output
      error
      attempt_count
      approved_by
      approved_at
      started_at
      finished_at
      workflow_step {
        id
        step_order
        type
        config
      }
    }
  }
`;

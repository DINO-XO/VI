import { gql } from '@apollo/client';

export const GET_USER_ORGS = gql`
  query GetUserOrgs {
    org_members(order_by: { created_at: asc }) {
      id
      org_id
      role
      organization {
        id
        name
        quota_calls_allowed
        quota_calls_used
        org_usage_summary {
          avg_run_duration_seconds
        }
      }
    }
  }
`;

export const GET_ORG_WORKFLOWS = gql`
  query GetOrgWorkflows($org_id: uuid!) {
    workflows(
      where: { org_id: { _eq: $org_id } }
      order_by: { created_at: desc }
    ) {
      id
      name
      description
      created_by
      created_at
      workflow_steps(order_by: { step_order: asc }) {
        id
        step_order
        type
        config
      }
      workflow_triggers {
        id
        type
        config
        is_active
      }
      workflow_runs(order_by: { started_at: desc }, limit: 1) {
        id
        status
        started_at
        finished_at
      }
    }
  }
`;

export const GET_WORKFLOW_BY_ID = gql`
  query GetWorkflowById($id: uuid!) {
    workflows_by_pk(id: $id) {
      id
      org_id
      name
      description
      workflow_steps(order_by: { step_order: asc }) {
        id
        step_order
        type
        config
      }
      workflow_triggers {
        id
        type
        config
        is_active
      }
    }
  }
`;

export const GET_ORG_USAGE = gql`
  query GetOrgUsage($org_id: uuid!) {
    organizations_by_pk(id: $org_id) {
      id
      name
      quota_calls_allowed
      quota_calls_used
      org_usage_summary {
        avg_run_duration_seconds
      }
    }
  }
`;

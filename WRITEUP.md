# AI Agent Workflow Builder — Technical Write-Up

## 1. Schema Reasoning & Architecture

The database schema is designed for multi-tenant isolation, step-by-step workflow execution, real-time status subscriptions, and aggregated organization metrics.

### Key Tables & Relationships
- **`organizations`**: Stores tenant identity and call quota limits (`quota_calls_allowed` vs `quota_calls_used`).
- **`org_members`**: Maps `auth.users(id)` to organizations with explicit roles (`owner`, `editor`, `viewer`). Includes a `UNIQUE(org_id, user_id)` constraint.
- **`workflows`**: Belongs to an organization via `org_id` FK with `ON DELETE CASCADE`.
- **`workflow_steps`**: Ordered sequence of steps (`step_order` 1..N) per workflow. Types supported: `llm_call`, `http_request`, `db_write`, `notify`, `conditional_branch`, `approval_gate`. Unique constraint on `(workflow_id, step_order)`.
- **`workflow_triggers`**: Associated triggers (`manual`, `webhook`, `scheduled`, `db_event`) per workflow. Stores webhook secrets in JSONB `config`.
- **`workflow_runs`**: Represents a single execution instance. Status transitions: `pending` → `running` → `paused` → `completed` | `failed`. `org_id` is denormalized directly on `workflow_runs` for fast permission traversal.
- **`step_runs`**: Detailed state per step execution. Status transitions: `pending` → `running` → `succeeded` | `failed` | `paused_awaiting_approval`. Tracks attempt counts (`attempt_count`), input, output, errors, and approval audit metadata (`approved_by`, `approved_at`).
- **`notifications`**: Table targeted by `notify` step types. Inserts into this table fire a Hasura Event Trigger (`notify_event_trigger`).

### Computed Field / Aggregation View
```sql
CREATE VIEW org_usage_summary AS
SELECT
  o.id AS org_id,
  o.quota_calls_allowed,
  o.quota_calls_used,
  ROUND(
    AVG(EXTRACT(EPOCH FROM (wr.finished_at - wr.started_at)))::NUMERIC,
    2
  ) AS avg_run_duration_seconds
FROM organizations o
LEFT JOIN workflow_runs wr ON wr.org_id = o.id AND wr.finished_at IS NOT NULL
GROUP BY o.id;
```
This view is tracked in Hasura and related 1:1 to `organizations` as `org_usage_summary`.

---

## 2. Layer 1 vs. Layer 2 Permissions

### Layer 1: Declarative Hasura Permissions (Org & Role Scoping)
- All table permissions check membership dynamically through the relationship:
  `org_id: { org_members: { user_id: { _eq: "X-Hasura-User-Id" } } }`
- **Isolation**: A user in Org B cannot read or modify any row belonging to Org A.
- **Role Restrictions**:
  - `viewer`: Read-only access across all tables. Cannot insert, update, or delete anything.
  - `editor`: Can create/update workflows, steps, and non-webhook triggers. Declaratively blocked from creating `db_write` or `notify` steps via `type: {_nin: ["db_write", "notify"]}`.
  - `owner`: Full unrestricted access within their organization.
- **Execution Isolation**: No user role (not even `owner`) is granted direct `INSERT` or `UPDATE` permissions on `workflow_runs` or `step_runs`. Execution state can ONLY be modified by serverless Action handlers using the Hasura Admin Secret.

### Layer 2: Code-Enforced Gating (Serverless Action Handlers)
Declarative Hasura permissions alone cannot enforce dynamic runtime logic or action gating. Layer 2 gating is enforced inside the serverless functions:
1. **Step Creation Gating (`upsertWorkflowStep`)**: The handler inspects `X-Hasura-User-Id`, checks the user's role in `org_members` server-side, and explicitly returns HTTP 403 / GraphQL error if an `editor` tries to add a `db_write` or `notify` step, or create a `webhook` trigger.
2. **Step Approval Gating (`approveStep`)**: When resuming a workflow paused at an `approval_gate`, the handler re-verifies the user's role in `org_members`. If the user is a `viewer` or not in the organization, the action rejects the call with an explicit 403 error.
3. **Execution Gating (`triggerWorkflowRun`)**: Verifies caller role is not `viewer` and verifies organization quota (`quota_calls_used < quota_calls_allowed`) before creating a run.

---

## 3. Pause & Resume Mechanism for `approval_gate`

1. **Pause**: When `step-runner.ts` encounters a step of type `approval_gate`:
   - It sets `step_runs.status = 'paused_awaiting_approval'`.
   - It sets `workflow_runs.status = 'paused'`.
   - Execution stops and returns immediately without incrementing quota.
2. **Live Feedback**: The GraphQL WebSocket subscription (`SUBSCRIBE_STEP_RUN_STATUS`) receives the status update and renders an "Approve & Resume" button in the frontend (visible only to `owner` and `editor`).
3. **Resume**: When `approveStep(step_run_id)` is invoked:
   - Evaluates Layer 2 role permissions (`owner` or `editor` required).
   - Updates `step_runs`: `status = 'succeeded'`, sets `approved_by` and `approved_at`.
   - Updates `workflow_runs.status = 'running'`.
   - Locates the next step index (`step_order > current`) and calls `runStepsFrom(workflowRunId, nextIndex, steps, orgId)`.
   - Processing resumes from the paused index through to completion.

---

## 4. Retries, Quota & Integrations

- **Retries**: `llm_call` and `http_request` steps execute with up to 2 attempts total and a 500ms backoff. Each attempt updates `step_runs.attempt_count` in the database so retries are transparently visible in the UI.
- **Quota Tracking**: Quota call count is incremented on final run completion based on the actual external calls (`llm_call` + `http_request`) executed during the session.
- **LLM Integration & Disclosed Stub**: Uses Groq's free-tier API (`llama-3.1-8b-instant`). If `GROQ_API_KEY` is not present, it executes a 1.5s artificial delay, returns a deterministic completion, and logs `[STUBBED]`.

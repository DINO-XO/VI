import { hasuraAdminQuery } from './hasura-client.js';
import { executeLLMCall } from './llm.js';
import { WorkflowStep, StepRun } from './types.js';

export async function runStepsFrom(
  workflowRunId: string,
  startIndex: number,
  steps: WorkflowStep[],
  orgId: string
): Promise<{ status: string; message: string }> {
  let previousOutput: any = null;
  let callsMadeInThisSession = 0;

  // Fetch previous step run output if starting mid-way (e.g., after approval)
  if (startIndex > 0) {
    const prevQuery = await hasuraAdminQuery<{
      step_runs: StepRun[];
    }>(
      `
      query GetPrevOutput($workflow_run_id: uuid!) {
        step_runs(
          where: { workflow_run_id: { _eq: $workflow_run_id }, status: { _eq: "succeeded" } }
          order_by: { finished_at: desc }
          limit: 1
        ) {
          output
        }
      }
    `,
      { workflow_run_id: workflowRunId }
    );
    if (prevQuery.step_runs[0]) {
      previousOutput = prevQuery.step_runs[0].output;
    }
  }

  let i = startIndex;

  while (i < steps.length) {
    const step = steps[i];

    // Find or create step_run entry
    const findStepRunQuery = await hasuraAdminQuery<{
      step_runs: StepRun[];
    }>(
      `
      query FindStepRun($workflow_run_id: uuid!, $workflow_step_id: uuid!) {
        step_runs(
          where: { workflow_run_id: { _eq: $workflow_run_id }, workflow_step_id: { _eq: $workflow_step_id } }
        ) {
          id
          attempt_count
        }
      }
    `,
      { workflow_run_id: workflowRunId, workflow_step_id: step.id }
    );

    let stepRunId: string;
    let attemptCount = 0;

    if (findStepRunQuery.step_runs[0]) {
      stepRunId = findStepRunQuery.step_runs[0].id;
      attemptCount = findStepRunQuery.step_runs[0].attempt_count;
    } else {
      const createStepRunQuery = await hasuraAdminQuery<{
        insert_step_runs_one: StepRun;
      }>(
        `
        mutation CreateStepRun($object: step_runs_insert_input!) {
          insert_step_runs_one(object: $object) {
            id
            attempt_count
          }
        }
      `,
        {
          object: {
            workflow_run_id: workflowRunId,
            workflow_step_id: step.id,
            status: 'pending',
            input: previousOutput ? { previous_output: previousOutput } : {},
            attempt_count: 0,
          },
        }
      );
      stepRunId = createStepRunQuery.insert_step_runs_one.id;
    }

    // Mark step running
    await hasuraAdminQuery(
      `
      mutation MarkStepRunning($id: uuid!, $started_at: timestamptz!) {
        update_step_runs_by_pk(
          pk_columns: { id: $id }
          _set: { status: "running", started_at: $started_at }
        ) {
          id
        }
      }
    `,
      { id: stepRunId, started_at: new Date().toISOString() }
    );

    // APPROVAL GATE CHECK
    if (step.type === 'approval_gate') {
      await hasuraAdminQuery(
        `
        mutation PauseForApproval($step_run_id: uuid!, $workflow_run_id: uuid!) {
          update_step_runs_by_pk(
            pk_columns: { id: $step_run_id }
            _set: { status: "paused_awaiting_approval" }
          ) {
            id
          }
          update_workflow_runs_by_pk(
            pk_columns: { id: $workflow_run_id }
            _set: { status: "paused" }
          ) {
            id
          }
        }
      `,
        { step_run_id: stepRunId, workflow_run_id: workflowRunId }
      );

      return {
        status: 'paused',
        message: `Workflow run paused at step ${step.step_order} awaiting approval`,
      };
    }

    // EXECUTE STEP LOGIC WITH RETRIES (up to 2 attempts)
    let stepSuccess = false;
    let stepOutput: any = null;
    let stepError: string | null = null;
    const maxAttempts = step.type === 'llm_call' || step.type === 'http_request' ? 2 : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      attemptCount++;

      // Update attempt count in DB so retries are visible
      await hasuraAdminQuery(
        `
        mutation UpdateAttemptCount($id: uuid!, $attempt_count: Int!) {
          update_step_runs_by_pk(
            pk_columns: { id: $id }
            _set: { attempt_count: $attempt_count }
          ) {
            id
          }
        }
      `,
        { id: stepRunId, attempt_count: attemptCount }
      );

      try {
        if (step.type === 'llm_call') {
          callsMadeInThisSession++;
          const prompt = step.config.prompt || 'Summarize the input context.';
          stepOutput = await executeLLMCall(prompt, previousOutput);
          stepSuccess = true;
          break;
        } else if (step.type === 'http_request') {
          callsMadeInThisSession++;
          const url =
            step.config.url || 'https://api.chucknorris.io/jokes/random';
          const method = step.config.method || 'GET';

          const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', ...(step.config.headers || {}) },
            body: method !== 'GET' && step.config.body ? JSON.stringify(step.config.body) : undefined,
          });

          if (!res.ok) {
            throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
          }
          stepOutput = await res.json();
          stepSuccess = true;
          break;
        } else if (step.type === 'db_write') {
          // Stores previous step output directly into step_runs.output
          stepOutput = {
            saved: true,
            table: step.config.table || 'workflow_results',
            data: previousOutput,
            timestamp: new Date().toISOString(),
          };
          stepSuccess = true;
          break;
        } else if (step.type === 'conditional_branch') {
          const condition = step.config.condition || {};
          const prevStr = JSON.stringify(previousOutput || {}).toLowerCase();
          const targetValue = (condition.if_output_contains || 'yes').toLowerCase();

          let conditionMet = prevStr.includes(targetValue);
          if (previousOutput && typeof previousOutput === 'object' && previousOutput.should_continue) {
            conditionMet = previousOutput.should_continue.toLowerCase() === targetValue;
          }

          stepOutput = {
            evaluated_condition: condition,
            condition_met: conditionMet,
            decision: conditionMet ? 'take_if_branch' : 'take_else_branch',
          };
          stepSuccess = true;

          // Branching logic: adjust index if else_skip_to is specified and condition failed
          if (!conditionMet && typeof condition.else_skip_to === 'number') {
            const nextStepOrder = condition.else_skip_to;
            const targetIdx = steps.findIndex((s) => s.step_order === nextStepOrder);
            if (targetIdx !== -1) {
              i = targetIdx - 1; // -1 because while loop does i++
            }
          }
          break;
        } else if (step.type === 'notify') {
          const msg = step.config.message || 'Notification triggered from workflow';

          // Insert into notifications table -> fires Hasura Event Trigger!
          await hasuraAdminQuery(
            `
            mutation CreateNotification($object: notifications_insert_input!) {
              insert_notifications_one(object: $object) {
                id
              }
            }
          `,
            {
              object: {
                org_id: orgId,
                workflow_run_id: workflowRunId,
                step_run_id: stepRunId,
                message: msg,
                payload: { previous_output: previousOutput, config: step.config },
              },
            }
          );

          stepOutput = { notification_sent: true, message: msg };
          stepSuccess = true;
          break;
        }
      } catch (err: any) {
        stepError = err?.message || 'Step execution error';
        console.warn(
          `[Step ${step.step_order} Attempt ${attempt} Failed]:`,
          stepError
        );
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms backoff
        }
      }
    }

    if (!stepSuccess) {
      // Mark step failed
      await hasuraAdminQuery(
        `
        mutation MarkStepFailed($id: uuid!, $error: String!, $finished_at: timestamptz!) {
          update_step_runs_by_pk(
            pk_columns: { id: $id }
            _set: { status: "failed", error: $error, finished_at: $finished_at }
          ) {
            id
          }
          update_workflow_runs_by_pk(
            pk_columns: { id: "${workflowRunId}" }
            _set: { status: "failed", finished_at: $finished_at }
          ) {
            id
          }
        }
      `,
        { id: stepRunId, error: stepError, finished_at: new Date().toISOString() }
      );

      return {
        status: 'failed',
        message: `Step ${step.step_order} (${step.type}) failed: ${stepError}`,
      };
    }

    // Mark step succeeded
    await hasuraAdminQuery(
      `
      mutation MarkStepSucceeded($id: uuid!, $output: jsonb!, $finished_at: timestamptz!) {
        update_step_runs_by_pk(
          pk_columns: { id: $id }
          _set: { status: "succeeded", output: $output, finished_at: $finished_at }
        ) {
          id
        }
      }
    `,
      {
        id: stepRunId,
        output: stepOutput,
        finished_at: new Date().toISOString(),
      }
    );

    previousOutput = stepOutput;
    i++;
  }

  // Workflow completed successfully!
  await hasuraAdminQuery(
    `
    mutation MarkRunCompleted($id: uuid!, $finished_at: timestamptz!, $calls: Int!, $org_id: uuid!) {
      update_workflow_runs_by_pk(
        pk_columns: { id: $id }
        _set: { status: "completed", finished_at: $finished_at }
      ) {
        id
      }
      update_organizations_by_pk(
        pk_columns: { id: $org_id }
        _inc: { quota_calls_used: $calls }
      ) {
        id
      }
    }
  `,
    {
      id: workflowRunId,
      finished_at: new Date().toISOString(),
      calls: callsMadeInThisSession,
      org_id: orgId,
    }
  );

  return {
    status: 'completed',
    message: 'Workflow run completed successfully',
  };
}

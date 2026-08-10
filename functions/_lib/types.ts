export type WorkflowStepType =
  | 'llm_call'
  | 'http_request'
  | 'db_write'
  | 'notify'
  | 'conditional_branch'
  | 'approval_gate';

export type TriggerType = 'manual' | 'webhook' | 'scheduled' | 'db_event';

export type RunStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';

export type StepRunStatus =
  | 'pending'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'paused_awaiting_approval';

export interface WorkflowStep {
  id: string;
  workflow_id: string;
  step_order: number;
  type: WorkflowStepType;
  config: Record<string, any>;
}

export interface WorkflowTrigger {
  id: string;
  workflow_id: string;
  type: TriggerType;
  config: Record<string, any>;
  is_active: boolean;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  org_id: string;
  status: RunStatus;
  triggered_by?: string | null;
  trigger_type: string;
  started_at: string;
  finished_at?: string | null;
}

export interface StepRun {
  id: string;
  workflow_run_id: string;
  workflow_step_id: string;
  status: StepRunStatus;
  input?: any;
  output?: any;
  error?: string | null;
  attempt_count: number;
  approved_by?: string | null;
  approved_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
}

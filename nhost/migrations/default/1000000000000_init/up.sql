-- ===== UP MIGRATION =====

-- 1. ORGANIZATIONS
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  quota_calls_allowed INT NOT NULL DEFAULT 1000,
  quota_calls_used INT NOT NULL DEFAULT 0,
  quota_period_start DATE NOT NULL DEFAULT date_trunc('month', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. ORG_MEMBERS
CREATE TABLE org_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- 3. WORKFLOWS
CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. WORKFLOW_STEPS
CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  step_order INT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('llm_call', 'http_request', 'db_write', 'notify', 'conditional_branch', 'approval_gate')),
  config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(workflow_id, step_order)
);

-- 5. WORKFLOW_TRIGGERS
CREATE TABLE workflow_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('manual', 'webhook', 'scheduled', 'db_event')),
  config JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. WORKFLOW_RUNS
CREATE TABLE workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'paused', 'completed', 'failed')) DEFAULT 'pending',
  triggered_by UUID,
  trigger_type TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

-- 7. STEP_RUNS
CREATE TABLE step_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_run_id UUID NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  workflow_step_id UUID NOT NULL REFERENCES workflow_steps(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'paused_awaiting_approval')) DEFAULT 'pending',
  input JSONB,
  output JSONB,
  error TEXT,
  attempt_count INT NOT NULL DEFAULT 0,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

-- 8. NOTIFICATIONS (for notify step type + Event Trigger)
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  workflow_run_id UUID REFERENCES workflow_runs(id) ON DELETE CASCADE,
  step_run_id UUID REFERENCES step_runs(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  payload JSONB,
  sent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ===== INDEXES =====
CREATE INDEX idx_org_members_org_id ON org_members(org_id);
CREATE INDEX idx_org_members_user_id ON org_members(user_id);
CREATE INDEX idx_workflows_org_id ON workflows(org_id);
CREATE INDEX idx_workflow_steps_workflow_id ON workflow_steps(workflow_id);
CREATE INDEX idx_workflow_triggers_workflow_id ON workflow_triggers(workflow_id);
CREATE INDEX idx_workflow_runs_workflow_id ON workflow_runs(workflow_id);
CREATE INDEX idx_workflow_runs_org_id ON workflow_runs(org_id);
CREATE INDEX idx_step_runs_workflow_run_id ON step_runs(workflow_run_id);
CREATE INDEX idx_step_runs_workflow_step_id ON step_runs(workflow_step_id);
CREATE INDEX idx_step_runs_run_status ON step_runs(workflow_run_id, status);
CREATE INDEX idx_notifications_org_id ON notifications(org_id);
CREATE INDEX idx_notifications_workflow_run_id ON notifications(workflow_run_id);

-- ===== ORG USAGE SUMMARY VIEW =====
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
LEFT JOIN workflow_runs wr
  ON wr.org_id = o.id AND wr.finished_at IS NOT NULL
GROUP BY o.id;

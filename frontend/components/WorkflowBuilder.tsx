'use client';

import React, { useState } from 'react';
import { Plus, Trash2, Webhook, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';

export interface StepItem {
  id?: string;
  step_order: number;
  type: 'llm_call' | 'http_request' | 'db_write' | 'notify' | 'conditional_branch' | 'approval_gate';
  config: Record<string, any>;
  configStr?: string;
}

interface Props {
  workflowId: string;
  initialSteps: StepItem[];
  userRole: 'owner' | 'editor' | 'viewer';
  onSaveStep: (step: StepItem) => Promise<boolean>;
  onAddWebhookTrigger: (secret: string) => Promise<boolean>;
  existingTriggers?: Array<{ id: string; type: string; config: any }>;
}

export default function WorkflowBuilder({
  workflowId,
  initialSteps,
  userRole,
  onSaveStep,
  onAddWebhookTrigger,
  existingTriggers = [],
}: Props) {
  const [steps, setSteps] = useState<StepItem[]>(
    initialSteps.map((s) => ({
      ...s,
      configStr: JSON.stringify(s.config, null, 2),
    }))
  );
  const [newStepType, setNewStepType] = useState<StepItem['type']>('llm_call');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null);

  const canEdit = userRole === 'owner' || userRole === 'editor';

  const handleAddStep = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const nextOrder = steps.length + 1;
    let defaultConfig: Record<string, any> = {};

    if (newStepType === 'llm_call') {
      defaultConfig = { prompt: 'Analyze sentiment of previous step output' };
    } else if (newStepType === 'http_request') {
      defaultConfig = { url: 'https://api.chucknorris.io/jokes/random', method: 'GET' };
    } else if (newStepType === 'db_write') {
      defaultConfig = { table: 'workflow_results' };
    } else if (newStepType === 'notify') {
      defaultConfig = { message: 'Alert: Workflow completed approval gate' };
    } else if (newStepType === 'conditional_branch') {
      defaultConfig = { condition: { if_output_contains: 'yes', else_skip_to: 4 } };
    }

    const newStep: StepItem = {
      workflow_id: workflowId,
      step_order: nextOrder,
      type: newStepType,
      config: defaultConfig,
      configStr: JSON.stringify(defaultConfig, null, 2),
    };

    const ok = await onSaveStep(newStep);
    if (ok) {
      setSteps([...steps, newStep]);
      setSuccessMsg(`Added ${newStepType} step successfully`);
    } else {
      setErrorMsg(`Failed to add ${newStepType} step. Owner permission may be required for ${newStepType}.`);
    }
  };

  const handleCreateWebhook = async () => {
    const secret = `wh_sec_${Math.random().toString(36).slice(2, 11)}`;
    const ok = await onAddWebhookTrigger(secret);
    if (ok) {
      setGeneratedSecret(secret);
      setSuccessMsg('Webhook trigger created!');
    } else {
      setErrorMsg('Failed to create webhook trigger. Only Owners can create webhooks.');
    }
  };

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="bg-red-950/80 border border-red-800 text-red-200 p-4 rounded-xl flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-200 p-4 rounded-xl flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* STEP LIST BUILDER */}
      <div className="bg-nhost-card border border-nhost-border rounded-xl p-6 space-y-6">
        <h3 className="text-lg font-bold text-white">Workflow Steps</h3>

        <div className="space-y-4">
          {steps.map((step, idx) => (
            <div
              key={step.id || idx}
              className="bg-nhost-dark border border-nhost-border p-4 rounded-lg space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 rounded-full bg-nhost-blue text-white text-xs font-bold flex items-center justify-center">
                    {step.step_order}
                  </span>
                  <span className="font-semibold text-white font-mono uppercase">{step.type}</span>
                  {(step.type === 'db_write' || step.type === 'notify') && (
                    <span className="text-xs bg-purple-950 text-purple-300 border border-purple-800 px-2 py-0.5 rounded">
                      Owner Only Gated
                    </span>
                  )}
                </div>
              </div>

              {/* JSON Config Editor */}
              <div>
                <label className="text-xs font-semibold text-gray-400 block mb-1">
                  JSON Config
                </label>
                <textarea
                  value={step.configStr}
                  onChange={(e) => {
                    const newStr = e.target.value;
                    const copy = [...steps];
                    copy[idx].configStr = newStr;
                    try {
                      copy[idx].config = JSON.parse(newStr);
                    } catch {}
                    setSteps(copy);
                  }}
                  disabled={!canEdit}
                  rows={3}
                  className="w-full bg-black/50 text-gray-200 font-mono text-xs p-3 rounded border border-gray-800 focus:outline-none focus:border-nhost-blue"
                />
              </div>
            </div>
          ))}
        </div>

        {/* ADD STEP CONTROLS */}
        {canEdit && (
          <div className="flex items-center space-x-3 pt-4 border-t border-nhost-border">
            <select
              value={newStepType}
              onChange={(e) => setNewStepType(e.target.value as any)}
              className="bg-nhost-dark text-white border border-nhost-border px-3 py-2 rounded-lg text-sm focus:outline-none"
            >
              <option value="llm_call">llm_call</option>
              <option value="http_request">http_request</option>
              <option value="db_write">db_write (Owner only)</option>
              <option value="notify">notify (Owner only)</option>
              <option value="conditional_branch">conditional_branch</option>
              <option value="approval_gate">approval_gate</option>
            </select>

            <button
              onClick={handleAddStep}
              className="flex items-center space-x-2 bg-nhost-blue hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Step</span>
            </button>
          </div>
        )}
      </div>

      {/* TRIGGERS SECTION */}
      <div className="bg-nhost-card border border-nhost-border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Triggers</h3>
          {canEdit && (
            <button
              onClick={handleCreateWebhook}
              className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors cursor-pointer"
            >
              <Webhook className="w-4 h-4" />
              <span>Add Webhook Trigger</span>
            </button>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div className="bg-nhost-dark p-3 rounded-lg border border-nhost-border flex items-center justify-between">
            <span className="text-gray-300 font-medium">Manual Trigger</span>
            <span className="text-xs bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
              Active (Default)
            </span>
          </div>

          {existingTriggers.map((tr) => (
            <div
              key={tr.id}
              className="bg-nhost-dark p-3 rounded-lg border border-nhost-border space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-gray-300 font-medium capitalize">{tr.type} Trigger</span>
                <span className="text-xs bg-blue-950 text-blue-300 border border-blue-800 px-2 py-0.5 rounded">
                  Active
                </span>
              </div>
              {tr.config?.secret && (
                <div className="text-xs font-mono bg-black/60 p-2 rounded text-gray-300">
                  Secret: <span className="text-amber-400 font-bold">{tr.config.secret}</span>
                </div>
              )}
            </div>
          ))}

          {generatedSecret && (
            <div className="bg-amber-950/80 border border-amber-800 p-4 rounded-lg space-y-2">
              <span className="text-xs font-bold text-amber-300 uppercase block">
                Generated Webhook Trigger Secret
              </span>
              <p className="text-xs text-gray-300">
                Use this cURL command to trigger this workflow live from a terminal:
              </p>
              <pre className="bg-black text-emerald-400 p-3 rounded font-mono text-xs overflow-x-auto">
{`curl -X POST http://localhost:1337/v1/graphql \\
  -H "Content-Type: application/json" \\
  -d '{"query": "mutation { triggerWorkflowRunViaWebhook(workflow_id: \\"${workflowId}\\", secret: \\"${generatedSecret}\\") { run_id status message } }"}'`}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import Link from 'next/link';
import { Play, Plus, ArrowRight, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

export interface WorkflowItem {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  workflow_steps: Array<{
    id: string;
    step_order: number;
    type: string;
    config: any;
  }>;
  workflow_triggers: Array<{
    id: string;
    type: string;
    config: any;
    is_active: boolean;
  }>;
  workflow_runs: Array<{
    id: string;
    status: string;
    started_at: string;
    finished_at?: string;
  }>;
}

interface Props {
  workflows: WorkflowItem[];
  userRole: 'owner' | 'editor' | 'viewer';
  onRunWorkflow: (workflowId: string) => void;
  isRunning?: boolean;
}

export default function WorkflowList({ workflows, userRole, onRunWorkflow, isRunning }: Props) {
  const canRun = userRole === 'owner' || userRole === 'editor';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Workflows</h2>
        {canRun && (
          <Link
            href="/dashboard/workflows/new"
            className="flex items-center space-x-2 bg-nhost-blue hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Workflow</span>
          </Link>
        )}
      </div>

      {workflows.length === 0 ? (
        <div className="bg-nhost-card border border-nhost-border rounded-xl p-8 text-center text-gray-400">
          No workflows found for this organization.
        </div>
      ) : (
        <div className="grid gap-4">
          {workflows.map((wf) => {
            const lastRun = wf.workflow_runs[0];

            return (
              <div
                key={wf.id}
                className="bg-nhost-card border border-nhost-border rounded-xl p-5 hover:border-gray-600 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <Link
                      href={`/dashboard/workflows/${wf.id}`}
                      className="text-lg font-bold text-white hover:text-nhost-blue transition-colors"
                    >
                      {wf.name}
                    </Link>
                    <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded">
                      {wf.workflow_steps.length} steps
                    </span>
                  </div>

                  {wf.description && <p className="text-sm text-gray-400">{wf.description}</p>}

                  <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                    {wf.workflow_steps.map((step) => (
                      <span
                        key={step.id}
                        className="bg-gray-800 text-gray-300 border border-gray-700 px-2 py-0.5 rounded font-mono"
                      >
                        {step.step_order}. {step.type}
                      </span>
                    ))}
                  </div>

                  {lastRun && (
                    <div className="flex items-center space-x-2 text-xs pt-1 text-gray-400">
                      <span>Last Run:</span>
                      <span
                        className={`font-semibold flex items-center space-x-1 ${
                          lastRun.status === 'completed'
                            ? 'text-emerald-400'
                            : lastRun.status === 'failed'
                            ? 'text-red-400'
                            : lastRun.status === 'paused'
                            ? 'text-amber-400'
                            : 'text-blue-400'
                        }`}
                      >
                        {lastRun.status === 'completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {lastRun.status === 'failed' && <XCircle className="w-3.5 h-3.5" />}
                        {lastRun.status === 'paused' && <AlertCircle className="w-3.5 h-3.5" />}
                        {lastRun.status === 'running' && <Clock className="w-3.5 h-3.5 animate-spin" />}
                        <span>{lastRun.status.toUpperCase()}</span>
                      </span>
                      <span>({new Date(lastRun.started_at).toLocaleTimeString()})</span>
                      <Link
                        href={`/dashboard/workflows/${wf.id}/runs/${lastRun.id}`}
                        className="text-nhost-blue hover:underline text-xs flex items-center space-x-1 ml-2"
                      >
                        <span>View Run</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-3 self-end md:self-center">
                  <Link
                    href={`/dashboard/workflows/${wf.id}`}
                    className="text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-lg text-sm transition-colors"
                  >
                    Edit
                  </Link>

                  {/* RUN BUTTON: Completely hidden for viewer role */}
                  {canRun && (
                    <button
                      onClick={() => onRunWorkflow(wf.id)}
                      disabled={isRunning}
                      className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-1.5 rounded-lg text-sm transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      <span>Run</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

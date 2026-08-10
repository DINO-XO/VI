'use client';

import React from 'react';
import { CheckCircle2, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';
import ApproveButton from './ApproveButton';

export interface StepRunItem {
  id: string;
  workflow_run_id: string;
  workflow_step_id: string;
  status: 'pending' | 'running' | 'succeeded' | 'failed' | 'paused_awaiting_approval';
  input?: any;
  output?: any;
  error?: string;
  attempt_count: number;
  approved_by?: string;
  approved_at?: string;
  started_at?: string;
  finished_at?: string;
  workflow_step?: {
    id: string;
    step_order: number;
    type: string;
    config: any;
  };
}

interface Props {
  stepRun: StepRunItem;
  userRole: 'owner' | 'editor' | 'viewer';
  onApproveSuccess: () => void;
}

export default function StepCard({ stepRun, userRole, onApproveSuccess }: Props) {
  const stepType = stepRun.workflow_step?.type || 'step';
  const stepOrder = stepRun.workflow_step?.step_order || 1;

  const isPending = stepRun.status === 'pending';
  const isRunning = stepRun.status === 'running';
  const isSucceeded = stepRun.status === 'succeeded';
  const isFailed = stepRun.status === 'failed';
  const isPaused = stepRun.status === 'paused_awaiting_approval';

  return (
    <div
      className={`bg-nhost-card border rounded-xl p-5 space-y-4 transition-all duration-300 ${
        isSucceeded
          ? 'border-emerald-800/80 shadow-emerald-950/20'
          : isFailed
          ? 'border-red-800/80 shadow-red-950/20'
          : isPaused
          ? 'border-amber-500/80 shadow-amber-950/30 animate-pulse'
          : isRunning
          ? 'border-blue-500/80 shadow-blue-950/20'
          : 'border-nhost-border'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span
            className={`w-7 h-7 rounded-full font-bold text-xs flex items-center justify-center ${
              isSucceeded
                ? 'bg-emerald-600 text-white'
                : isFailed
                ? 'bg-red-600 text-white'
                : isPaused
                ? 'bg-amber-500 text-black font-extrabold'
                : isRunning
                ? 'bg-nhost-blue text-white animate-spin'
                : 'bg-gray-800 text-gray-400'
            }`}
          >
            {isSucceeded ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : isFailed ? (
              <XCircle className="w-4 h-4" />
            ) : isPaused ? (
              <AlertCircle className="w-4 h-4" />
            ) : isRunning ? (
              <RefreshCw className="w-4 h-4" />
            ) : (
              stepOrder
            )}
          </span>

          <div>
            <h4 className="font-bold text-white uppercase text-sm font-mono">
              Step {stepOrder}: {stepType}
            </h4>
            {stepRun.started_at && (
              <p className="text-xs text-gray-400">
                Started: {new Date(stepRun.started_at).toLocaleTimeString()}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {stepRun.attempt_count > 1 && (
            <span className="text-xs bg-amber-950 text-amber-300 border border-amber-800 px-2 py-0.5 rounded font-mono">
              Attempts: {stepRun.attempt_count}
            </span>
          )}

          <span
            className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
              isSucceeded
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                : isFailed
                ? 'bg-red-950 text-red-300 border border-red-800'
                : isPaused
                ? 'bg-amber-950 text-amber-300 border border-amber-500 font-bold'
                : isRunning
                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                : 'bg-gray-800 text-gray-400'
            }`}
          >
            {stepRun.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* PAUSED APPROVAL GATE CONTROLS */}
      {isPaused && (
        <div className="bg-amber-950/40 border border-amber-800 p-4 rounded-lg space-y-3">
          <div className="flex items-center space-x-2 text-amber-300 font-semibold text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Workflow execution is paused awaiting manual approval</span>
          </div>

          <ApproveButton
            stepRunId={stepRun.id}
            userRole={userRole}
            onSuccess={onApproveSuccess}
          />
        </div>
      )}

      {/* OUTPUT & ERROR DISPLAY */}
      {stepRun.output && (
        <div className="space-y-1">
          <span className="text-xs font-semibold text-gray-400">Output:</span>
          <pre className="bg-black/70 text-emerald-400 font-mono text-xs p-3 rounded border border-gray-800 overflow-x-auto max-h-48">
            {JSON.stringify(stepRun.output, null, 2)}
          </pre>
        </div>
      )}

      {stepRun.error && (
        <div className="space-y-1">
          <span className="text-xs font-semibold text-red-400">Error:</span>
          <pre className="bg-red-950/50 text-red-200 font-mono text-xs p-3 rounded border border-red-800 overflow-x-auto">
            {stepRun.error}
          </pre>
        </div>
      )}
    </div>
  );
}

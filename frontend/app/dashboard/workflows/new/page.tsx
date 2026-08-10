'use client';

import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_WORKFLOW } from '../../../../lib/graphql/mutations';
import { useUserData } from '@nhost/react';
import { useRouter } from 'next/navigation';
import { useOrg } from '../../../../lib/context/OrgContext';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function NewWorkflowPage() {
  const userData = useUserData();
  const router = useRouter();
  const { selectedOrgId, activeMembership } = useOrg();
  const userRole = activeMembership?.role || 'viewer';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [createWorkflow, { loading }] = useMutation(CREATE_WORKFLOW);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId || !userData?.id) return;

    setErrorMsg(null);
    try {
      const res = await createWorkflow({
        variables: {
          org_id: selectedOrgId,
          name,
          description,
          created_by: userData.id,
        },
      });

      const newId = res.data?.insert_workflows_one?.id;
      if (newId) {
        router.push(`/dashboard/workflows/${newId}`);
      }
    } catch (err: any) {
      console.error('Create Workflow Error:', err);
      setErrorMsg(err?.message || 'Failed to create workflow');
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <Link
        href="/dashboard"
        className="inline-flex items-center space-x-2 text-sm text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Workflows</span>
      </Link>

      <h1 className="text-2xl font-bold text-white">Create New Workflow</h1>

      {errorMsg && (
        <div className="bg-red-950/80 border border-red-800 text-red-200 p-3 rounded-lg text-xs">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-[#161b22] border border-[#21262d] rounded-xl p-6 space-y-4">
        <div>
          <label className="text-xs font-semibold text-gray-300 block mb-1">Workflow Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Customer Support AI Pipeline"
            className="w-full bg-[#0d1117] border border-[#30363d] text-white px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-gray-300 block mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this automated workflow does..."
            rows={3}
            className="w-full bg-[#0d1117] border border-[#30363d] text-white px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading || userRole === 'viewer'}
          className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2.5 rounded-lg transition-colors text-sm disabled:opacity-50 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Create Workflow</span>
        </button>
      </form>
    </div>
  );
}

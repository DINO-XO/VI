'use client';

import React, { useState, useEffect } from 'react';
import { useAccessToken, useSignOut, useUserData } from '@nhost/react';
import { ApolloProvider, useMutation, gql } from '@apollo/client';
import { createApolloClient } from '../../lib/apollo';
import AuthGuard from '../../components/AuthGuard';
import OrgSelector from '../../components/OrgSelector';
import QuotaWidget from '../../components/QuotaWidget';
import { OrgProvider, useOrg } from '../../lib/context/OrgContext';
import { Workflow, LogOut, Plus, Building2, Zap } from 'lucide-react';
import Link from 'next/link';

const CREATE_MY_ORG = gql`
  mutation CreateMyOrg($name: String!, $user_id: uuid!) {
    insert_organizations_one(
      object: {
        name: $name
        quota_calls_allowed: 1000
        org_members: { data: [{ user_id: $user_id, role: "owner" }] }
      }
    ) {
      id
      name
    }
  }
`;

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const { signOut } = useSignOut();
  const userData = useUserData();

  const {
    memberships,
    selectedOrgId,
    setSelectedOrgId,
    activeMembership,
    loadingOrgs,
    refetchOrgs,
  } = useOrg();

  const [createMyOrg, { loading: isCreatingOrg }] = useMutation(CREATE_MY_ORG);
  const [newOrgName, setNewOrgName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreateOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData?.id || !newOrgName.trim()) return;
    setErrorMsg(null);
    try {
      const res = await createMyOrg({
        variables: { name: newOrgName.trim(), user_id: userData.id },
      });
      const newOrgId = res.data?.insert_organizations_one?.id;
      if (newOrgId) {
        setSelectedOrgId(newOrgId);
        await refetchOrgs();
      }
    } catch (err: any) {
      console.error('Create Org Error:', err);
      setErrorMsg(err?.message || 'Failed to create organization');
    }
  };

  const activeOrg = activeMembership?.organization;

  if (loadingOrgs) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#0d1117]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-600/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-blue-400 animate-pulse" />
          </div>
          <p className="text-gray-400 text-sm font-medium">Loading workspace...</p>
        </div>
      </div>
    );
  }

  // If user has no organization yet — show setup screen
  if (memberships.length === 0) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-gray-100 flex flex-col items-center justify-center p-4">
        <div className="relative w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-600/30">
                <Workflow className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">AI Workflow Builder</span>
            </div>
          </div>

          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-3">
                <Building2 className="w-7 h-7 text-blue-400" />
              </div>
              <h1 className="text-2xl font-extrabold text-white">Create Your Workspace</h1>
              <p className="text-sm text-gray-400 leading-relaxed">
                Set up an organization to start building and running AI-powered workflows.
              </p>
            </div>

            {errorMsg && (
              <div className="bg-red-950/60 border border-red-800/60 text-red-300 p-4 rounded-xl text-sm">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateOrgSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-300 block mb-2">
                  Organization Name
                </label>
                <input
                  type="text"
                  required
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full bg-[#0d1117] border border-[#30363d] focus:border-blue-500 text-white px-4 py-3 rounded-xl text-sm outline-none transition-colors placeholder:text-gray-600"
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingOrg || !newOrgName.trim()}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 text-sm shadow-lg shadow-blue-600/20"
              >
                {isCreatingOrg ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>{isCreatingOrg ? 'Creating...' : 'Create Organization'}</span>
              </button>
            </form>

            <button
              onClick={() => signOut()}
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors block text-center w-full"
            >
              Sign out ({userData?.email})
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-100 flex flex-col font-sans">
      {/* NAVBAR */}
      <header className="border-b border-[#21262d] bg-[#0d1117]/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-md shadow-blue-600/30">
              <Workflow className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-[15px] text-white tracking-tight hidden sm:block">
              AI Workflow Builder
            </span>
          </Link>

          <div className="flex-1 flex justify-center">
            <OrgSelector
              memberships={memberships}
              selectedOrgId={selectedOrgId}
              onSelectOrg={(id) => setSelectedOrgId(id)}
            />
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs text-gray-500 hidden md:block max-w-[160px] truncate">
              {userData?.email}
            </span>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-1.5 text-gray-400 hover:text-white bg-transparent hover:bg-[#21262d] border border-transparent hover:border-[#30363d] px-3 py-1.5 rounded-lg transition-all text-sm cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-xs font-medium">Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {/* PAGE BODY */}
      <div className="max-w-screen-xl mx-auto px-6 py-8 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <aside className="lg:col-span-1 space-y-4">
            {activeOrg && (
              <>
                <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-semibold text-white truncate">
                      {activeOrg.name}
                    </span>
                  </div>
                  <div
                    className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-semibold ${
                      activeMembership?.role === 'owner'
                        ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        : activeMembership?.role === 'editor'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-gray-700/50 text-gray-400 border border-gray-600/20'
                    }`}
                  >
                    {activeMembership?.role?.toUpperCase()}
                  </div>
                </div>

                <QuotaWidget
                  quotaUsed={activeOrg.quota_calls_used}
                  quotaAllowed={activeOrg.quota_calls_allowed}
                  avgDurationSec={activeOrg.org_usage_summary?.avg_run_duration_seconds}
                />
              </>
            )}
          </aside>

          <main className="lg:col-span-3 min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const accessToken = useAccessToken();
  const [apolloClient, setApolloClient] = useState(() => createApolloClient(accessToken));

  useEffect(() => {
    setApolloClient(createApolloClient(accessToken));
  }, [accessToken]);

  return (
    <AuthGuard>
      <ApolloProvider client={apolloClient}>
        <OrgProvider>
          <DashboardLayoutInner>{children}</DashboardLayoutInner>
        </OrgProvider>
      </ApolloProvider>
    </AuthGuard>
  );
}

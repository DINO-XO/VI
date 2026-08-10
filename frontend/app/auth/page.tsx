'use client';

import React, { useState, useEffect } from 'react';
import { useSignInEmailPassword, useSignUpEmailPassword, useAuthenticationStatus, useSignOut } from '@nhost/react';
import { useRouter } from 'next/navigation';
import { nhost } from '../../lib/nhost';
import { Workflow, LogIn, UserPlus, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { isAuthenticated, isLoading: isAuthLoading } = useAuthenticationStatus();
  const { signOut } = useSignOut();

  const { signInEmailPassword, isLoading: isSigningIn } = useSignInEmailPassword();
  const { signUpEmailPassword, isLoading: isSigningUp } = useSignUpEmailPassword();

  const router = useRouter();

  // If already authenticated when landing on page, redirect to dashboard
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, isAuthLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setErrorMsg(null);

    if (!email || !password) return;

    // If currently signed in, sign out first for clean session switch
    if (isAuthenticated) {
      await signOut();
    }

    if (isSignUp) {
      const res = await signUpEmailPassword(email, password);
      if (res.isSuccess) {
        setStatusMsg('Account created successfully! Logging in...');
        const loginRes = await signInEmailPassword(email, password);
        if (loginRes.isSuccess) {
          router.push('/dashboard');
        }
      } else {
        setErrorMsg(res.error?.message || 'Failed to sign up');
      }
    } else {
      const res = await signInEmailPassword(email, password);
      if (res.isSuccess) {
        router.push('/dashboard');
      } else {
        // Fallback: try creating account if not existing
        const signupRes = await signUpEmailPassword(email, password);
        if (signupRes.isSuccess) {
          setStatusMsg('New account created! Redirecting...');
          const autoLoginRes = await signInEmailPassword(email, password);
          if (autoLoginRes.isSuccess) {
            router.push('/dashboard');
          }
        } else {
          setErrorMsg(res.error?.message || 'Invalid email or password');
        }
      }
    }
  };

  const handleQuickFill = (emailVal: string) => {
    setEmail(emailVal);
    setPassword('password123');
    setStatusMsg(null);
    setErrorMsg(null);
  };

  const isLoading = isSigningIn || isSigningUp || isAuthLoading;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0d1117] p-4 text-gray-100 font-sans">
      <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl p-8 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 mb-2">
            <Workflow className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">AI Agent Workflow Builder</h1>
          <p className="text-xs text-gray-400">
            nhost + Hasura + Postgres + GraphQL + Next.js
          </p>
        </div>

        {statusMsg && (
          <div className="bg-emerald-950/80 border border-emerald-800 text-emerald-200 p-3 rounded-lg text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-950/80 border border-red-800 text-red-200 p-3 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full bg-[#0d1117] border border-[#30363d] text-white px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-300 block mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#0d1117] border border-[#30363d] text-white px-4 py-2.5 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center space-x-2 text-sm disabled:opacity-50 cursor-pointer shadow-lg shadow-blue-600/20"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : isSignUp ? (
              <UserPlus className="w-4 h-4" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            <span>{isLoading ? 'Authenticating...' : isSignUp ? 'Sign Up' : 'Sign In / Sign Up'}</span>
          </button>
        </form>

        <div className="pt-2 border-t border-[#30363d] space-y-3">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setStatusMsg(null);
              setErrorMsg(null);
            }}
            className="text-xs text-gray-400 hover:text-blue-400 transition-colors block text-center w-full"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Click to toggle Sign Up mode"}
          </button>

          <div className="bg-[#0d1117] p-3 rounded-lg border border-[#30363d] space-y-2">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Quick Fill Demo Accounts:
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('owner@a.com')}
                className="bg-gray-800 hover:bg-gray-700 text-purple-300 p-2 rounded text-left border border-purple-900/50 truncate cursor-pointer"
              >
                Org A Owner
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('editor@a.com')}
                className="bg-gray-800 hover:bg-gray-700 text-blue-300 p-2 rounded text-left border border-blue-900/50 truncate cursor-pointer"
              >
                Org A Editor
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('viewer@a.com')}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded text-left border border-gray-700 truncate cursor-pointer"
              >
                Org A Viewer
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('owner@b.com')}
                className="bg-gray-800 hover:bg-gray-700 text-emerald-300 p-2 rounded text-left border border-emerald-900/50 truncate cursor-pointer"
              >
                Org B Owner
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useAuthenticationStatus } from '@nhost/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { isAuthenticated, isLoading } = useAuthenticationStatus();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.push('/dashboard');
      } else {
        router.push('/auth');
      }
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-nhost-dark text-white">
      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-nhost-blue"></div>
    </div>
  );
}

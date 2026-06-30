'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('candidate' | 'hr' | 'admin')[];
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const router = useRouter();
  const { user, isAuthenticated, initialize } = useAuthStore();
  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
    // Read tokens and profiles from localStorage on mount
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (!mounted) return;
    // If auth state is initialized but user is not logged in, redirect
    const token = typeof window !== 'undefined' ? localStorage.getItem('capvia_access_token') : null;
    
    if (!token) {
      router.push('/auth/login');
      return;
    }

    if (user && allowedRoles) {
      if (!allowedRoles.includes(user.role)) {
        // Role mismatch: Redirect to login or access denied
        router.push('/auth/login');
      }
    }
  }, [mounted, user, isAuthenticated, router, allowedRoles]);

  // If not mounted yet, render loading skeleton to match server-side HTML
  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">Verifying Session Identity...</span>
      </div>
    );
  }

  const token = typeof window !== 'undefined' ? localStorage.getItem('capvia_access_token') : null;
  
  if (!token || (allowedRoles && user && !allowedRoles.includes(user.role))) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">Verifying Session Identity...</span>
      </div>
    );
  }

  return <>{children}</>;
}

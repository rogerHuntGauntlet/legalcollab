'use client';

import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('Dashboard layout: User:', user, 'Loading:', loading);
    if (!loading && !user) {
      console.log('Dashboard layout: Redirecting to login');
      router.replace('/login');
    }
  }, [user, loading, router]);

  // Show loading indicator if authentication is still being determined
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
        <p className="ml-4 text-blue-500">Loading...</p>
      </div>
    );
  }

  // Return null if not authenticated to prevent flash of content
  if (!user) {
    return null;
  }

  return (
    <div>
      {children}
    </div>
  );
} 
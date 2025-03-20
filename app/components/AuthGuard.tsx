'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('AuthGuard: Loading state:', loading, 'User:', user);
    if (!loading && !user) {
      console.log('AuthGuard: No user found, redirecting to login');
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    console.log('AuthGuard: Still loading...');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    console.log('AuthGuard: No user, returning null');
    return null;
  }

  console.log('AuthGuard: User is authenticated, rendering children');
  return <>{children}</>;
}; 
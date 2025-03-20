'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthForm } from '../components/AuthForm';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    console.log('Login page: User:', user, 'Loading:', loading);
    if (user && !loading) {
      console.log('Login page: Already logged in, redirecting to dashboard');
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full animate-spin"></div>
        <p className="ml-4 text-blue-500">Loading...</p>
      </div>
    );
  }

  // Only show login form if not authenticated
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen px-4 py-12 bg-gray-100">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900">Legal Collab</h1>
            <p className="mt-3 text-gray-600">
              Create, negotiate, and finalize legal agreements with AI assistance
            </p>
          </div>
          
          <AuthForm />
        </div>
      </div>
    );
  }

  // Return nothing while redirection happens
  return null;
} 
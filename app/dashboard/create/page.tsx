'use client';

import React from 'react';
import DocumentCreator from '../../components/DocumentCreator';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function CreateDocumentPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  
  // If not loading and no user, redirect to login
  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-4 border-gray-200 rounded-full border-t-indigo-500 animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Create New Document</h1>
          <p className="mt-1 text-sm text-gray-500">
            Fill in the details below to create a new legal document. You can use AI assistance to help draft the content.
          </p>
        </div>
        <DocumentCreator />
      </div>
    </div>
  );
} 
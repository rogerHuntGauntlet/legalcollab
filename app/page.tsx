'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();

  const handleStartNow = () => {
    router.push('/login');
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center mb-8">
          Legal Collaboration Platform
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Create Agreements</h2>
            <p className="text-gray-600">
              Draft new legal agreements with AI assistance, templates, and collaborative tools.
            </p>
            <button 
              onClick={handleStartNow}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Start Now
            </button>
          </div>
          
          <div className="bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4">Review Contracts</h2>
            <p className="text-gray-600">
              Review and annotate existing contracts with AI-powered insights and risk analysis.
            </p>
            <Link href="/login" className="inline-block mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors">
              Upload Contract
            </Link>
          </div>
        </div>
        
        <div className="mt-12 text-center">
          <p className="mb-4">Already have an account?</p>
          <Link href="/login" className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    </main>
  );
} 
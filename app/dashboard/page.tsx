'use client';

import React from 'react';
import { logoutUser } from '../firebase/auth';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  
  const handleLogout = async () => {
    try {
      await logoutUser();
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="flex items-center justify-between px-4 py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
            >
              Log Out
            </button>
          </div>
        </div>
      </header>
      <main>
        <div className="py-6 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="p-4 border-4 border-gray-200 rounded-lg h-96">
              <h2 className="mb-4 text-xl font-semibold">Welcome to Legal Collab!</h2>
              <p className="text-gray-600">
                You are now logged in to your dashboard. Start creating and managing legal agreements.
              </p>
              <div className="grid grid-cols-1 gap-4 mt-8 md:grid-cols-3">
                <Link href="/dashboard/create" className="block p-4 transition-shadow bg-white rounded-lg shadow hover:shadow-md">
                  <h3 className="mb-2 text-lg font-medium text-indigo-600">Create Agreement</h3>
                  <p className="text-sm text-gray-500">Draft a new legal agreement with AI assistance</p>
                </Link>
                <Link href="/dashboard/documents" className="block p-4 transition-shadow bg-white rounded-lg shadow hover:shadow-md">
                  <h3 className="mb-2 text-lg font-medium text-indigo-600">My Documents</h3>
                  <p className="text-sm text-gray-500">View and manage your agreements</p>
                </Link>
                <div className="p-4 bg-white rounded-lg shadow">
                  <h3 className="mb-2 text-lg font-medium">Templates</h3>
                  <p className="text-sm text-gray-500">Choose from pre-built agreement templates</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { getUserDocuments, getSharedDocuments, DocumentData } from '../../firebase/firestore';
import Link from 'next/link';

export default function DocumentListPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [myDocuments, setMyDocuments] = useState<DocumentData[]>([]);
  const [sharedDocuments, setSharedDocuments] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mine' | 'shared'>('mine');
  
  useEffect(() => {
    const fetchDocuments = async () => {
      if (authLoading) return;
      
      if (!user) {
        router.push('/login');
        return;
      }
      
      try {
        setLoading(true);
        const [myDocsResult, sharedDocsResult] = await Promise.all([
          getUserDocuments(user.uid, activeFilter || undefined),
          getSharedDocuments(user.email || '', activeFilter || undefined)
        ]);
        
        setMyDocuments(myDocsResult.documents);
        setSharedDocuments(sharedDocsResult.documents);
      } catch (err) {
        console.error('Error fetching documents:', err);
        setError('Failed to load documents');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDocuments();
  }, [user, authLoading, activeFilter, router]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      case 'negotiating':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'signed':
        return 'bg-purple-100 text-purple-800';
      case 'completed':
        return 'bg-indigo-100 text-indigo-800';
      case 'archived':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    switch (type) {
      case 'nda':
        return 'Non-Disclosure Agreement';
      case 'contract':
        return 'Service Contract';
      case 'employment':
        return 'Employment Agreement';
      case 'partnership':
        return 'Partnership Agreement';
      case 'tos':
        return 'Terms of Service';
      default:
        return type;
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-4 border-gray-200 rounded-full border-t-indigo-500 animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-gray-900">Documents</h1>
          <Link
            href="/dashboard/create"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700"
          >
            Create Document
          </Link>
        </div>

        <div className="mb-4 border-b border-gray-200">
          <nav className="flex -mb-px space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('mine')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'mine'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              My Documents
            </button>
            <button
              onClick={() => setActiveTab('shared')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'shared'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Shared With Me
            </button>
          </nav>
        </div>
        
        <div className="mb-6">
          <div className="sm:hidden">
            <label htmlFor="status-filter-mobile" className="sr-only">
              Filter by Status
            </label>
            <select
              id="status-filter-mobile"
              className="block w-full py-2 pl-3 pr-10 mt-1 text-base border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              value={activeFilter || ''}
              onChange={(e) => setActiveFilter(e.target.value || null)}
            >
              <option value="">All Documents</option>
              <option value="draft">Drafts</option>
              <option value="sent">Sent</option>
              <option value="negotiating">In Negotiation</option>
              <option value="approved">Approved</option>
              <option value="signed">Signed</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>
          <div className="hidden sm:block">
            <nav className="flex space-x-4" aria-label="Status filter">
              <button
                onClick={() => setActiveFilter(null)}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeFilter === null
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setActiveFilter('draft')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeFilter === 'draft'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Drafts
              </button>
              <button
                onClick={() => setActiveFilter('sent')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeFilter === 'sent'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Sent
              </button>
              <button
                onClick={() => setActiveFilter('negotiating')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeFilter === 'negotiating'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                In Negotiation
              </button>
              <button
                onClick={() => setActiveFilter('signed')}
                className={`px-3 py-2 text-sm font-medium rounded-md ${
                  activeFilter === 'signed'
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Signed
              </button>
            </nav>
          </div>
        </div>
        
        {error && (
          <div className="p-4 mb-6 text-red-700 bg-red-100 border-l-4 border-red-500 rounded-md">
            <p>{error}</p>
          </div>
        )}

        {/* Display documents based on active tab */}
        {activeTab === 'mine' ? (
          myDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg shadow">
              <svg
                className="w-16 h-16 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No documents</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new document.
              </p>
              <div className="mt-6">
                <Link
                  href="/dashboard/create"
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700"
                >
                  Create Document
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden bg-white shadow sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {myDocuments.map((doc) => (
                  <li key={doc.id}>
                    <Link
                      href={`/dashboard/documents/${doc.id}`}
                      className="block hover:bg-gray-50"
                    >
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center min-w-0">
                            <p className="text-sm font-medium text-indigo-600 truncate">
                              {doc.title}
                            </p>
                            <p className="flex items-center ml-2 text-sm text-gray-500">
                              <span className="text-xs italic">{getDocumentTypeLabel(doc.type)}</span>
                            </p>
                          </div>
                          <div className="flex flex-shrink-0 ml-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(doc.status)}`}>
                              {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between mt-2">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              <span>Created on {doc.createdAt?.toDate().toLocaleDateString()}</span>
                            </p>
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <p>
                              {doc.collaborators.length} {doc.collaborators.length === 1 ? 'collaborator' : 'collaborators'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )
        ) : (
          sharedDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-lg shadow">
              <svg
                className="w-16 h-16 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No shared documents</h3>
              <p className="mt-1 text-sm text-gray-500">
                You don't have any documents shared with you.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden bg-white shadow sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {sharedDocuments.map((doc) => (
                  <li key={doc.id}>
                    <Link
                      href={`/dashboard/documents/${doc.id}`}
                      className="block hover:bg-gray-50"
                    >
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center min-w-0">
                            <p className="text-sm font-medium text-indigo-600 truncate">
                              {doc.title}
                            </p>
                            <p className="flex items-center ml-2 text-sm text-gray-500">
                              <span className="text-xs italic">{getDocumentTypeLabel(doc.type)}</span>
                            </p>
                          </div>
                          <div className="flex flex-shrink-0 ml-2">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(doc.status)}`}>
                              {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                            </span>
                          </div>
                        </div>
                        <div className="flex justify-between mt-2">
                          <div className="sm:flex">
                            <p className="flex items-center text-sm text-gray-500">
                              <span>Created on {doc.createdAt?.toDate().toLocaleDateString()}</span>
                            </p>
                          </div>
                          <div className="flex items-center text-sm text-gray-500">
                            <p>
                              {doc.collaborators.length} {doc.collaborators.length === 1 ? 'collaborator' : 'collaborators'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )
        )}
      </div>
    </div>
  );
} 
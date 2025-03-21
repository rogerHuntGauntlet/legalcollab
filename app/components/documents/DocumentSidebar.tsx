import React from 'react';
import Link from 'next/link';
import { DocumentData } from '../../firebase/firestore';
import DownloadButton from '../DownloadButton';
import { getDocumentTypeLabel } from '../../utils/documentUtils';

interface DocumentSidebarProps {
  document: DocumentData;
  documentId: string;
  userHasSigned: boolean;
  signingLoading: boolean;
  onSignClick: () => void;
  onRewriteClick: () => void;
  onEditClick?: () => void;
  onCollaboratorClick: () => void;
}

const DocumentSidebar: React.FC<DocumentSidebarProps> = ({
  document,
  documentId,
  userHasSigned,
  signingLoading,
  onSignClick,
  onRewriteClick,
  onEditClick,
  onCollaboratorClick
}) => {
  // No hook needed since we're importing the function directly

  return (
    <div className="md:w-72 lg:w-80 p-4 border-r border-gray-200">
      <div className="sticky top-4">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900 break-words">{document.title}</h1>
          <span className="inline-flex items-center px-2.5 py-0.5 mt-2 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
          </span>
        </div>
        
        {/* Document actions */}
        <div className="space-y-3 mb-6">
          {document.status !== 'signed' && !userHasSigned && (
            <button 
              onClick={onSignClick}
              disabled={signingLoading}
              className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
            >
              <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
              </svg>
              {signingLoading ? 'Signing...' : 'Sign Document'}
            </button>
          )}
          
          {userHasSigned && (
            <div className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-green-700 bg-green-100 rounded">
              <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Document Signed
            </div>
          )}
          
          <button 
            onClick={onRewriteClick}
            className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-purple-700 bg-purple-100 rounded hover:bg-purple-200"
          >
            <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
            Rewrite with AI
          </button>
          
          <DownloadButton documentId={documentId} className="w-full" />
          
          <button 
            onClick={onEditClick}
            className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 rounded hover:bg-indigo-200"
          >
            <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Edit Document
          </button>
        </div>
        
        {/* Document details */}
        <div className="border-t border-gray-200 pt-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Document Details</h3>
          <div className="space-y-3 text-sm">
            <div>
              <span className="block text-xs text-gray-500">Type</span>
              <span className="text-gray-900">{getDocumentTypeLabel(document.type)}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-500">Created</span>
              <span className="text-gray-900">{document.createdAt?.toDate().toLocaleDateString()}</span>
            </div>
            <div>
              <span className="block text-xs text-gray-500">Status</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Collaborators section */}
        <div className="border-t border-gray-200 pt-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">Collaborators</h3>
            <button 
              onClick={onCollaboratorClick}
              className="text-xs text-indigo-600 hover:text-indigo-800"
            >
              Add
            </button>
          </div>
          <ul className="space-y-2">
            {document.collaborators.map((collaborator, index) => (
              <li key={index} className="flex items-center justify-between py-1">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{collaborator.email}</p>
                  <p className="text-xs text-gray-500">{collaborator.role}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="pt-2">
          <Link 
            href="/dashboard/documents" 
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            ← Back to Documents
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DocumentSidebar; 
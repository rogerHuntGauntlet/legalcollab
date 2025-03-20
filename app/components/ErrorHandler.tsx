'use client';

import React from 'react';
import Link from 'next/link';

interface ErrorHandlerProps {
  error: Error | null;
  resetError?: () => void;
}

export const ErrorHandler: React.FC<ErrorHandlerProps> = ({ error, resetError }) => {
  if (!error) return null;

  const isFirebasePermissionError = error.message.includes('Missing or insufficient permissions');
  const isFirestoreCollectionError = error.message.includes('Expected first argument to collection()') || 
                                     error.message.includes('CollectionReference') || 
                                     error.message.includes('FirebaseFirestore');
  
  return (
    <div className="p-4 mb-6 bg-red-100 border-l-4 border-red-500 rounded-md">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className="w-5 h-5 text-red-500"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            {isFirebasePermissionError
              ? 'Firebase Permission Error'
              : isFirestoreCollectionError
              ? 'Firestore Connection Error'
              : 'An error occurred'}
          </h3>
          <div className="mt-2 text-sm text-red-700">
            <p>{error.message}</p>
            
            {isFirebasePermissionError && (
              <div className="mt-4">
                <p className="font-semibold">Possible solutions:</p>
                <ul className="pl-5 mt-2 list-disc">
                  <li>
                    Firebase security rules need to be updated to allow writes to the documents collection. 
                    Please contact your administrator or refer to our <Link href="/FIREBASE_PERMISSIONS.md" className="text-indigo-600 hover:underline">Firebase Permissions Guide</Link>.
                  </li>
                  <li>
                    Make sure you are properly authenticated before attempting this operation.
                  </li>
                  <li>
                    Verify that your user account has the necessary permissions in Firebase.
                  </li>
                </ul>
                <div className="mt-4">
                  <p className="text-sm text-red-700">
                    For administrators: Update Firestore security rules to allow authenticated users 
                    to create documents. Example rules:
                  </p>
                  <pre className="p-3 mt-2 overflow-auto text-xs bg-gray-800 text-gray-100 rounded">
                    {`rules_version = '2';
                    
service cloud.firestore {
  match /databases/{database}/documents {
    match /documents/{documentId} {
      allow create: if request.auth != null;
      allow read, update, delete: if request.auth != null && (
        resource.data.createdBy == request.auth.uid || 
        resource.data.collaborators[].email.hasAny([request.auth.token.email])
      );
    }
  }
}`}
                  </pre>
                </div>
              </div>
            )}
            
            {isFirestoreCollectionError && (
              <div className="mt-4">
                <p className="font-semibold">Possible solutions:</p>
                <ul className="pl-5 mt-2 list-disc">
                  <li>
                    Refresh the page and try again. The Firestore connection may not have been properly initialized.
                  </li>
                  <li>
                    Check your Firebase project configuration and make sure the necessary environment variables are set.
                  </li>
                  <li>
                    Ensure you're properly logged in, as the database connection may depend on authentication.
                  </li>
                  <li>
                    Clear your browser cache and cookies, then try again.
                  </li>
                </ul>
              </div>
            )}
          </div>
          {resetError && (
            <div className="mt-4">
              <button
                type="button"
                onClick={resetError}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-800 bg-red-50 border border-transparent rounded-md hover:bg-red-100"
              >
                Try again
              </button>
              <Link
                href="/dashboard"
                className="inline-flex items-center px-3 py-2 ml-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Back to dashboard
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorHandler; 
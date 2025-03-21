'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { getDocument, DocumentData } from '../../../firebase/firestore';
import Link from 'next/link';
import DocumentSidebar from '../../../components/documents/DocumentSidebar';
import DocumentContent from '../../../components/documents/DocumentContent';
import RewriteModal from '../../../components/documents/RewriteModal';
import SignatureModal from '../../../components/SignatureModal';
import CollaboratorModal from '../../../components/documents/CollaboratorModal';
import useDocumentActions from '../../../hooks/useDocumentActions';
import LoadingSpinner from '../../../components/LoadingSpinner';
import ErrorMessage from '../../../components/ErrorMessage';

export default function DocumentDetails() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Modals visibility state
  const [showRewriteModal, setShowRewriteModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showCollaboratorModal, setShowCollaboratorModal] = useState(false);
  
  const documentId = Array.isArray(params.id) ? params.id[0] : params.id;
  
  // Custom hook for document operations
  const {
    userHasSigned,
    signingLoading,
    signerName,
    isRewriting,
    rewritePrompt,
    setRewritePrompt,
    confirmRewrite: executeRewrite,
    handleSaveSignature,
    handleAddCollaborator
  } = useDocumentActions(documentId, document, setDocument, setError);

  useEffect(() => {
    const fetchDocument = async () => {
      if (authLoading) return;
      
      if (!user) {
        router.push('/login');
        return;
      }
      
      try {
        setLoading(true);
        const doc = await getDocument(documentId);
        
        if (!doc) {
          setError('Document not found');
        } else {
          // Check if user has access to this document
          const isOwner = doc.createdBy === user.uid;
          const isCollaborator = doc.collaborators.some(
            c => c.email === user.email
          );
          
          if (!isOwner && !isCollaborator) {
            setError('You do not have permission to view this document');
          } else {
            setDocument(doc);
          }
        }
      } catch (err) {
        console.error('Error fetching document:', err);
        setError('Failed to load document');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDocument();
  }, [documentId, user, authLoading, router]);

  // Handler functions
  const handleRewriteWithAI = () => {
    setShowRewriteModal(true);
  };

  const confirmRewrite = async () => {
    await executeRewrite();
    setShowRewriteModal(false);
  };

  // Handle edit document click
  const handleEditClick = useCallback(() => {
    setIsEditing(true);
    // Scroll to document content after a brief delay to ensure UI updates
    setTimeout(() => {
      const contentElement = window.document.getElementById('document-content-section');
      if (contentElement) {
        contentElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }, []);

  if (authLoading || loading) {
    return <LoadingSpinner />;
  }

  if (error && !document) {
    return (
      <div className="max-w-4xl p-6 mx-auto mt-8">
        <ErrorMessage message={error}>
          <Link href="/dashboard" className="text-indigo-600 hover:underline">
            Return to Dashboard
          </Link>
        </ErrorMessage>
      </div>
    );
  }

  if (!document) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto mt-8">
      <div className="flex flex-col md:flex-row bg-white rounded-lg shadow">
        {/* Left sidebar with document info and controls */}
        <DocumentSidebar 
          document={document} 
          documentId={documentId}
          userHasSigned={userHasSigned}
          signingLoading={signingLoading}
          onSignClick={() => setShowSignatureModal(true)}
          onRewriteClick={handleRewriteWithAI}
          onEditClick={handleEditClick}
          onCollaboratorClick={() => setShowCollaboratorModal(true)}
        />
        
        {/* Main document content */}
        <div className="flex-1 p-4">
          {/* Display error message */}
          {error && <ErrorMessage message={error} />}
          
          {/* Document content */}
          <DocumentContent 
            document={document} 
            documentId={documentId}
            setDocument={setDocument}
            setError={setError}
          />
        </div>
      </div>
      
      {/* Modals */}
      <RewriteModal
        isOpen={showRewriteModal}
        onClose={() => setShowRewriteModal(false)}
        isRewriting={isRewriting}
        rewritePrompt={rewritePrompt}
        setRewritePrompt={setRewritePrompt}
        onConfirm={confirmRewrite}
      />

      {showSignatureModal && (
        <SignatureModal
          isOpen={showSignatureModal}
          onClose={() => setShowSignatureModal(false)}
          onSave={handleSaveSignature}
          title="Sign This Document"
        />
      )}

      <CollaboratorModal
        isOpen={showCollaboratorModal}
        onClose={() => setShowCollaboratorModal(false)}
        onAddCollaborator={(email, role) => {
          // Handle the case where the Promise might return undefined
          return handleAddCollaborator(email, role)
            .then(result => result === undefined ? false : result);
        }}
      />
    </div>
  );
} 
'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { getDocument, updateDocument, DocumentData, addSignatureToDocument, hasUserSignedDocument, addCollaborator } from '../../../firebase/firestore';
import { serverTimestamp } from 'firebase/firestore';
import Link from 'next/link';
import LoadingIndicator from '../../../components/LoadingIndicator';
import SignatureModal from '../../../components/SignatureModal';
import DownloadButton from '../../../components/DownloadButton';

export default function DocumentDetails() {
  const params = useParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'details' | 'collaborators'>('preview');
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewritePrompt, setRewritePrompt] = useState('');
  const [showRewriteModal, setShowRewriteModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [showSelectionPopup, setShowSelectionPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [editedContent, setEditedContent] = useState<string>('');
  const contentRef = React.useRef<HTMLPreElement>(null);
  const [isRewritingSection, setIsRewritingSection] = useState(false);
  const [saveInstructions, setSaveInstructions] = useState<string>('');
  const [selectionInstructions, setSelectionInstructions] = useState<string>('');
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [userHasSigned, setUserHasSigned] = useState(false);
  const [signingLoading, setSigningLoading] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [showEditAnimation, setShowEditAnimation] = useState(false);
  const [showCollaboratorModal, setShowCollaboratorModal] = useState(false);
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
  const [newCollaboratorRole, setNewCollaboratorRole] = useState<'counterparty' | 'viewer'>('viewer');
  const [addingCollaborator, setAddingCollaborator] = useState(false);
  
  const documentId = Array.isArray(params.id) ? params.id[0] : params.id;

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

  useEffect(() => {
    const checkSignatureStatus = async () => {
      if (!document || !user) return;
      
      try {
        const hasSigned = await hasUserSignedDocument(documentId, user.uid);
        setUserHasSigned(hasSigned);
        
        // Set signer name if available
        if (user.displayName) {
          setSignerName(user.displayName);
        } else {
          // Fallback to email if name not available
          setSignerName(user.email?.split('@')[0] || '');
        }
      } catch (err) {
        console.error('Error checking signature status:', err);
      }
    };
    
    checkSignatureStatus();
  }, [document, user, documentId]);

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

  const handleRewriteWithAI = async () => {
    setShowRewriteModal(true);
  };

  const confirmRewrite = async () => {
    if (!document) return;
    
    setIsRewriting(true);
    
    try {
      // Call LLM API to rewrite document
      const documentType = document.type;
      const prompt = rewritePrompt || `Rewrite ${getDocumentTypeLabel(documentType)} titled "${document.title}". Make it clearer, reduce ambiguity, and strengthen legal protections.`;
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      try {
        const response = await fetch('/api/generate-document', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            prompt,
            documentType,
            title: document.title,
            isRewrite: true
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(`Failed to rewrite document: ${errorData.error || response.statusText}`);
        }
        
        const data = await response.json();
        const rewrittenContent = data.content;
        
        // Update document in Firestore
        await updateDocument(documentId, {
          fullContent: rewrittenContent,
          description: document.description + ' (AI Rewritten)'
        });
        
        // Refresh document data
        const refreshedDoc = await getDocument(documentId);
        setDocument(refreshedDoc);
        setShowRewriteModal(false);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          throw new Error('Document rewrite timed out. Please try again with a simpler request.');
        }
        throw fetchError;
      }
    } catch (err: any) {
      console.error('Document rewrite error:', err);
      setError(`Failed to rewrite document: ${err.message || 'Unknown error'}. Please try again later.`);
    } finally {
      setIsRewriting(false);
    }
  };

  // Function to enter edit mode
  const handleEditClick = () => {
    if (document?.fullContent) {
      setEditedContent(document.fullContent);
      setIsEditing(true);
      
      // Activate animation
      setShowEditAnimation(true);
      
      // Turn off animation after 3 seconds
      setTimeout(() => {
        setShowEditAnimation(false);
      }, 3000);
      
      // Scroll to the document content section
      setTimeout(() => {
        const documentContentElement = window.document.getElementById('document-content-section');
        if (documentContentElement) {
          documentContentElement.scrollIntoView({ behavior: 'smooth' });
        }
        
        // Add focus to the editor after scrolling
        if (contentRef.current) {
          contentRef.current.focus();
        }
      }, 100);
    }
  };

  // Function to save changes
  const saveChanges = async () => {
    if (!document) return;
    
    try {
      // If instructions are provided, process content with AI before saving
      if (saveInstructions.trim()) {
        setIsRewritingSection(true);
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        try {
          const response = await fetch('/api/generate-document', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              prompt: `Revise document: ${saveInstructions}. Document: ${editedContent.substring(0, 5000)}`,
              documentType: document.type,
              title: document.title,
              isRewrite: true
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            
            // If it fails, save the content as-is but inform the user
            console.warn('Failed to process with AI. Saving changes as-is.');
            await updateDocument(documentId, {
              fullContent: editedContent,
              description: document.description + ' (Edited)'
            });
            
            // Refresh document data
            const refreshedDoc = await getDocument(documentId);
            setDocument(refreshedDoc);
            setError(`AI processing failed: ${errorData.error || response.statusText}. Changes saved as-is.`);
            setIsEditing(false);
            setSaveInstructions('');
            return;
          }
          
          const data = await response.json();
          const improvedContent = data.content;
          
          // Update document with AI-improved content
          await updateDocument(documentId, {
            fullContent: improvedContent,
            description: document.description + ' (AI Enhanced)'
          });
          
          // Refresh document data
          const refreshedDoc = await getDocument(documentId);
          setDocument(refreshedDoc);
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          
          if (fetchError.name === 'AbortError') {
            console.warn('AI processing timed out. Saving content as-is.');
            // Save the original edited content without AI processing
            await updateDocument(documentId, {
              fullContent: editedContent,
              description: document.description + ' (Edited)'
            });
            
            // Refresh document data and show a warning
            const refreshedDoc = await getDocument(documentId);
            setDocument(refreshedDoc);
            setError('AI processing timed out. Your changes have been saved without AI enhancements.');
            setIsEditing(false);
            setSaveInstructions('');
            return;
          }
          throw fetchError;
        }
      } else {
        // Save changes without AI processing
        await updateDocument(documentId, {
          fullContent: editedContent,
          description: document.description + ' (Edited)'
        });
        
        // Refresh document data
        const refreshedDoc = await getDocument(documentId);
        setDocument(refreshedDoc);
      }
      
      // Reset states
      setIsEditing(false);
      setSaveInstructions('');
    } catch (err: any) {
      console.error('Error saving document:', err);
      setError(`Failed to save changes: ${err.message || 'Unknown error'}. Please try again later.`);
    } finally {
      setIsRewritingSection(false);
    }
  };

  // Function to cancel editing
  const cancelEditing = () => {
    setIsEditing(false);
    setSelectedText('');
    setSelectionRange(null);
    setShowSelectionPopup(false);
    setSaveInstructions('');
    setShowEditAnimation(false);
  };

  // Function to handle text selection
  const handleTextSelection = () => {
    if (!isEditing || !contentRef.current) return;
    
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
      setShowSelectionPopup(false);
      return;
    }
    
    const range = selection.getRangeAt(0);
    const preRect = contentRef.current.getBoundingClientRect();
    const selectionRect = range.getBoundingClientRect();
    
    // Calculate position relative to the pre element
    const top = selectionRect.bottom - preRect.top + window.scrollY;
    const left = (selectionRect.left + selectionRect.right) / 2 - preRect.left;
    
    setSelectedText(selection.toString());
    setPopupPosition({ top, left });
    setShowSelectionPopup(true);
    
    // Store the selection range (indices in the text content)
    const start = range.startOffset;
    const end = range.endOffset;
    
    setSelectionRange({ start, end });
  };

  // Function to handle AI rewrite of selected text
  const handleRewriteSelection = async () => {
    if (!selectedText || !selectionRange || !document) return;
    
    try {
      setShowSelectionPopup(false);
      setIsRewritingSection(true);
      
      // Create prompt with user instructions if provided
      const instructionPrefix = selectionInstructions.trim() 
        ? `Improve this text: ${selectionInstructions}.` 
        : `Improve this text for clarity and legal precision:`;
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

      try {
        // Call LLM API to rewrite selected portion
        const response = await fetch('/api/generate-document', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            prompt: `${instructionPrefix} "${selectedText.substring(0, 1000)}"`,
            documentType: document.type,
            title: document.title,
            isRewrite: true,
            isPartialRewrite: true
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(`Failed to rewrite selection: ${errorData.error || response.statusText}`);
        }
        
        const data = await response.json();
        const rewrittenSection = data.content;
        
        // Replace the selected text in the edited content
        const before = editedContent.substring(0, selectionRange.start);
        const after = editedContent.substring(selectionRange.end);
        setEditedContent(before + rewrittenSection + after);
        
        // Reset selection instructions for next use
        setSelectionInstructions('');
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          throw new Error('Rewrite timed out. Please try a smaller selection or simpler instructions.');
        }
        throw fetchError;
      }
    } catch (err: any) {
      console.error('Section rewrite error:', err);
      setError(`Failed to rewrite selection: ${err.message || 'Unknown error'}`);
    } finally {
      setIsRewritingSection(false);
    }
  };

  const openSignatureModal = () => {
    setShowSignatureModal(true);
  };

  const handleOpenCollaboratorModal = () => {
    setShowCollaboratorModal(true);
  };

  const handleAddCollaborator = async () => {
    if (!newCollaboratorEmail.trim() || !document) return;
    
    try {
      setAddingCollaborator(true);
      await addCollaborator(documentId, newCollaboratorEmail, newCollaboratorRole);
      
      // Refresh document data to show the new collaborator
      const refreshedDoc = await getDocument(documentId);
      setDocument(refreshedDoc);
      
      // Clear the form and close the modal
      setNewCollaboratorEmail('');
      setNewCollaboratorRole('viewer');
      setShowCollaboratorModal(false);
    } catch (err: any) {
      console.error('Error adding collaborator:', err);
      setError(`Failed to add collaborator: ${err.message || 'Unknown error'}`);
    } finally {
      setAddingCollaborator(false);
    }
  };

  const handleSaveSignature = async (signatureData: string) => {
    if (!document || !user || !user.email) return;
    
    setSigningLoading(true);
    
    try {
      // Determine the user's role in this document
      const userRole = document.collaborators.find(c => c.email === user.email)?.role;
      const signingRole = userRole === 'owner' ? 'owner' : 'counterparty';
      
      // Get IP address (in a real app, you'd want to do this server-side)
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      
      await addSignatureToDocument(documentId, {
        userId: user.uid,
        email: user.email,
        name: signerName,
        signatureImage: signatureData,
        role: signingRole as 'owner' | 'counterparty',
        ipAddress: ipData.ip
      });
      
      // Refresh document data
      const refreshedDoc = await getDocument(documentId);
      setDocument(refreshedDoc);
      setUserHasSigned(true);
    } catch (err) {
      console.error('Error saving signature:', err);
      setError('Failed to save signature. Please try again later.');
    } finally {
      setSigningLoading(false);
      setShowSignatureModal(false);
    }
  };

  // Add a helper function to format the timestamp properly whether it's a Firestore Timestamp or a JavaScript Date
  const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return 'Unknown date';
    
    // If it's a Firestore Timestamp
    if (timestamp && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleString();
    }
    
    // If it's already a Date object or can be converted to one
    try {
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      return date.toLocaleString();
    } catch (err) {
      console.error('Error formatting timestamp:', err);
      return 'Invalid date';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-16 h-16 border-4 border-t-4 border-gray-200 rounded-full border-t-indigo-500 animate-spin"></div>
      </div>
    );
  }

  if (error && !document) {
    return (
      <div className="max-w-4xl p-6 mx-auto mt-8">
        <div className="p-4 text-red-700 bg-red-100 border-l-4 border-red-500 rounded-md">
          <p>{error}</p>
          <Link href="/dashboard" className="text-indigo-600 hover:underline">
            Return to Dashboard
          </Link>
        </div>
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
                  onClick={openSignatureModal}
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
                onClick={handleRewriteWithAI}
                className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-purple-700 bg-purple-100 rounded hover:bg-purple-200"
              >
                <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                Rewrite with AI
              </button>
              
              <DownloadButton documentId={documentId} className="w-full" />
              
              <button 
                onClick={handleEditClick}
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
                  onClick={handleOpenCollaboratorModal}
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
        
        {/* Main document content */}
        <div className="flex-1 p-4">
          {/* Display error message */}
          {error && (
            <div className="p-4 mb-4 text-red-700 bg-red-100 border-l-4 border-red-500 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Document content */}
          <div id="document-content-section">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Document Content</h2>
            {document.fullContent ? (
              <div className="bg-white border border-gray-200 rounded-md">
                {isEditing ? (
                  <div className="relative">
                    {isRewritingSection && (
                      <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-20">
                        <LoadingIndicator size="small" message="AI is rewriting selected text..." />
                      </div>
                    )}
                    <div className={`bg-yellow-50 px-6 py-2 border-b border-yellow-200 flex items-center ${showEditAnimation ? 'animate-pulse' : ''}`}>
                      <svg className="w-5 h-5 text-yellow-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                      </svg>
                      <span className="text-sm font-medium text-yellow-800">Editing Mode: Changes will not be saved until you click "Save Changes"</span>
                    </div>
                    <pre 
                      ref={contentRef}
                      className={`whitespace-pre-wrap text-sm p-6 outline-none min-h-[400px] border-2 ${showEditAnimation ? 'border-yellow-500' : 'border-yellow-300'} transition-colors duration-300`} 
                      contentEditable={true}
                      onMouseUp={handleTextSelection}
                      onKeyUp={handleTextSelection}
                      onInput={(e) => setEditedContent(e.currentTarget.textContent || '')}
                      suppressContentEditableWarning={true}
                    >
                      {document.fullContent}
                    </pre>
                    
                    {showSelectionPopup && !isRewritingSection && (
                      <div 
                        className="absolute z-10 bg-white rounded-md shadow-lg border border-gray-200 p-3 w-64"
                        style={{ top: `${popupPosition.top}px`, left: `${popupPosition.left}px`, transform: 'translateX(-50%)' }}
                      >
                        <h4 className="text-xs font-medium text-gray-700 mb-2">Rewrite Selection with AI</h4>
                        
                        <textarea
                          value={selectionInstructions}
                          onChange={(e) => setSelectionInstructions(e.target.value)}
                          placeholder="Enter specific instructions (optional)"
                          className="block w-full px-2 py-1 border border-gray-300 rounded text-xs mb-2"
                          rows={2}
                        />
                        
                        <div className="flex justify-end">
                          <button 
                            onClick={() => setShowSelectionPopup(false)}
                            className="text-xs text-gray-500 hover:text-gray-700 mr-2"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={handleRewriteSelection}
                            className="flex items-center text-xs text-white bg-purple-600 px-2 py-1 rounded hover:bg-purple-700"
                          >
                            <svg className="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                            </svg>
                            Rewrite
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-4 px-6">
                      <label htmlFor="saveInstructions" className="block text-sm font-medium text-gray-700 mb-1">
                        AI Instructions (Optional)
                      </label>
                      <div className="relative">
                        <textarea
                          id="saveInstructions"
                          value={saveInstructions}
                          onChange={(e) => setSaveInstructions(e.target.value)}
                          placeholder="Enter instructions for AI to improve your document (e.g., 'Make language more formal', 'Strengthen legal protections', 'Simplify technical terms')"
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          rows={2}
                        />
                        {saveInstructions.trim() && (
                          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                            <svg className="h-5 w-5 text-purple-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-7a1 1 0 011-1h2a1 1 0 010 2h-2a1 1 0 01-1-1zm-1-4a1 1 0 011-1h4a1 1 0 010 2h-4a1 1 0 01-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        {saveInstructions.trim() 
                          ? "AI will process your document with these instructions before saving" 
                          : "If left blank, your changes will be saved as-is without AI processing"}
                      </p>
                    </div>
                    
                    <div className="flex justify-end space-x-4 mt-6 px-6 pb-6">
                      <button
                        onClick={cancelEditing}
                        className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Cancel Editing
                      </button>
                      <button
                        onClick={saveChanges}
                        className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                      >
                        <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <pre className="whitespace-pre-wrap text-sm p-6">{document.fullContent}</pre>
                    
                    {/* Signatures Section */}
                    {document.signatures && document.signatures.length > 0 && (
                      <div className="border-t border-gray-200 p-6">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Signatures</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {document.signatures.map((signature, index) => (
                            <div key={index} className="border border-gray-200 rounded-md p-4">
                              <div className="flex justify-between mb-2">
                                <div>
                                  <p className="text-sm font-medium">{signature.name}</p>
                                  <p className="text-xs text-gray-500">{signature.email}</p>
                                  <p className="text-xs text-gray-500">
                                    {signature.role === 'owner' ? 'Document Owner' : 'Counterparty'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {formatTimestamp(signature.timestamp)}
                                  </p>
                                </div>
                                <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium h-fit">
                                  Signed
                                </div>
                              </div>
                              <div className="border border-gray-200 rounded-md p-2 bg-gray-50">
                                <img 
                                  src={signature.signatureImage} 
                                  alt={`Signature of ${signature.name}`} 
                                  className="h-12 object-contain mx-auto"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="p-6 text-center text-gray-500 bg-white border border-gray-200 rounded-md">
                <p>No document content available.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* AI Rewrite Modal */}
      {showRewriteModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" aria-hidden="true" onClick={() => setShowRewriteModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="px-4 pt-5 pb-4 bg-white sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto bg-purple-100 rounded-full sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="w-6 h-6 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                      Rewrite Document with AI
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        The AI will create a completely new version of your document. You can provide specific instructions for the rewrite or use the default prompt.
                      </p>
                      <div className="mt-4">
                        <label htmlFor="rewritePrompt" className="block text-sm font-medium text-gray-700">
                          Rewrite Instructions (Optional)
                        </label>
                        <textarea
                          id="rewritePrompt"
                          name="rewritePrompt"
                          rows={4}
                          value={rewritePrompt}
                          onChange={(e) => setRewritePrompt(e.target.value)}
                          placeholder="E.g., Make the contract more concise, focus on IP protection, use plain language, etc."
                          className="block w-full mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 bg-gray-50 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={isRewriting}
                  onClick={confirmRewrite}
                  className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-purple-600 border border-transparent rounded-md shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {isRewriting ? 'Rewriting...' : 'Rewrite Document'}
                </button>
                <button
                  type="button"
                  disabled={isRewriting}
                  onClick={() => setShowRewriteModal(false)}
                  className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {showSignatureModal && (
        <SignatureModal
          isOpen={showSignatureModal}
          onClose={() => setShowSignatureModal(false)}
          onSave={handleSaveSignature}
          title="Sign This Document"
        />
      )}

      {/* Add Collaborator Modal */}
      {showCollaboratorModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" aria-hidden="true" onClick={() => setShowCollaboratorModal(false)}></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-lg shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="px-4 pt-5 pb-4 bg-white sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 mx-auto bg-blue-100 rounded-full sm:mx-0 sm:h-10 sm:w-10">
                    <svg className="w-6 h-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                    </svg>
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                      Add Collaborator
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 mb-4">
                        Add a new collaborator to this document. They will receive an email notification.
                      </p>
                      <div className="mb-4">
                        <label htmlFor="collaboratorEmail" className="block text-sm font-medium text-gray-700">
                          Email Address
                        </label>
                        <input
                          type="email"
                          id="collaboratorEmail"
                          value={newCollaboratorEmail}
                          onChange={(e) => setNewCollaboratorEmail(e.target.value)}
                          placeholder="Enter email address"
                          className="block w-full mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                      </div>
                      <div>
                        <label htmlFor="collaboratorRole" className="block text-sm font-medium text-gray-700">
                          Role
                        </label>
                        <select
                          id="collaboratorRole"
                          value={newCollaboratorRole}
                          onChange={(e) => setNewCollaboratorRole(e.target.value as 'counterparty' | 'viewer')}
                          className="block w-full mt-1 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        >
                          <option value="viewer">Viewer (Read Only)</option>
                          <option value="counterparty">Counterparty (Can Sign)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="px-4 py-3 bg-gray-50 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={addingCollaborator || !newCollaboratorEmail.trim()}
                  onClick={handleAddCollaborator}
                  className="inline-flex justify-center w-full px-4 py-2 text-base font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {addingCollaborator ? 'Adding...' : 'Add Collaborator'}
                </button>
                <button
                  type="button"
                  disabled={addingCollaborator}
                  onClick={() => setShowCollaboratorModal(false)}
                  className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
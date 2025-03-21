import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  updateDocument, 
  getDocument, 
  hasUserSignedDocument, 
  addSignatureToDocument, 
  addCollaborator,
  DocumentData 
} from '../firebase/firestore';

interface UseDocumentActionsProps {
  documentId: string;
  document: DocumentData | null;
  setDocument: (doc: DocumentData | null) => void;
  setError: (error: string | null) => void;
}

export default function useDocumentActions(
  documentId: string,
  document: DocumentData | null,
  setDocument: (doc: DocumentData | null) => void,
  setError: (error: string | null) => void
) {
  const { user } = useAuth();
  
  // Signature related state
  const [userHasSigned, setUserHasSigned] = useState(false);
  const [signingLoading, setSigningLoading] = useState(false);
  const [signerName, setSignerName] = useState('');
  
  // AI rewrite related state
  const [isRewriting, setIsRewriting] = useState(false);
  const [rewritePrompt, setRewritePrompt] = useState('');
  
  // Collaborator related state
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
  const [newCollaboratorRole, setNewCollaboratorRole] = useState<'counterparty' | 'viewer'>('viewer');
  const [addingCollaborator, setAddingCollaborator] = useState(false);

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

  const handleRewriteWithAI = () => {
    // Just set the flag to show the modal
    // Actual rewrite happens in confirmRewrite
    return;
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
    }
  };

  const handleAddCollaborator = async (email: string, role: 'counterparty' | 'viewer') => {
    if (!email.trim() || !document) return;
    
    try {
      setAddingCollaborator(true);
      await addCollaborator(documentId, email, role);
      
      // Refresh document data to show the new collaborator
      const refreshedDoc = await getDocument(documentId);
      setDocument(refreshedDoc);
      
      return true;
    } catch (err: any) {
      console.error('Error adding collaborator:', err);
      setError(`Failed to add collaborator: ${err.message || 'Unknown error'}`);
      return false;
    } finally {
      setAddingCollaborator(false);
    }
  };

  // Helper function to format timestamps
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

  return {
    userHasSigned,
    signingLoading,
    signerName,
    isRewriting,
    rewritePrompt,
    setRewritePrompt,
    addingCollaborator,
    newCollaboratorEmail,
    setNewCollaboratorEmail,
    newCollaboratorRole,
    setNewCollaboratorRole,
    handleRewriteWithAI,
    confirmRewrite,
    handleSaveSignature,
    handleAddCollaborator,
    formatTimestamp,
    getDocumentTypeLabel
  };
} 
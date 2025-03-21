import React, { useState, useRef, useCallback } from 'react';
import { DocumentData, updateDocument, getDocument } from '../../firebase/firestore';
import LoadingIndicator from '../LoadingIndicator';
import { formatTimestamp } from '../../utils/documentUtils';
import RichTextEditor from './RichTextEditor';
import TableOfContents from './TableOfContents';

interface DocumentContentProps {
  document: DocumentData;
  documentId: string;
  setDocument: (document: DocumentData | null) => void;
  setError: (error: string | null) => void;
}

const DocumentContent: React.FC<DocumentContentProps> = ({
  document,
  documentId,
  setDocument,
  setError
}) => {
  // Document editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<string>('');
  const [showEditAnimation, setShowEditAnimation] = useState(false);
  const [isRewritingSection, setIsRewritingSection] = useState(false);
  const [saveInstructions, setSaveInstructions] = useState<string>('');
  
  // Text selection state
  const [selectedText, setSelectedText] = useState<string>('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [showSelectionPopup, setShowSelectionPopup] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0 });
  const [selectionInstructions, setSelectionInstructions] = useState<string>('');
  
  const contentRef = useRef<HTMLPreElement>(null);

  // Navigate to a specific position in the document
  const navigateToPosition = useCallback((position: number) => {
    if (!contentRef.current) return;
    
    // Create a range at the specified position
    const range = window.document.createRange();
    const textNode = contentRef.current.firstChild;
    
    if (textNode) {
      // Set position based on character index
      const offset = Math.min(position, textNode.textContent?.length || 0);
      range.setStart(textNode, offset);
      range.collapse(true);
      
      // Select the range
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      
      // Scroll to the position
      const rect = range.getBoundingClientRect();
      window.scrollTo({
        top: window.scrollY + rect.top - 200, // 200px above the position
        behavior: 'smooth'
      });
    }
  }, []);

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
      }, 100);
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

  // Function to handle text selection from rich text editor
  const handleRichTextSelection = (text: string, range: { start: number; end: number } | null) => {
    if (!text || !range) {
      setShowSelectionPopup(false);
      return;
    }
    
    // Get editor element position
    const editorElement = window.document.querySelector('[contenteditable="true"]');
    if (!editorElement) return;
    
    const editorRect = editorElement.getBoundingClientRect();
    const selection = window.getSelection();
    
    if (selection && selection.rangeCount > 0) {
      const selectionRect = selection.getRangeAt(0).getBoundingClientRect();
      
      // Calculate position for popup
      const top = selectionRect.bottom - editorRect.top + window.scrollY;
      const left = (selectionRect.left + selectionRect.right) / 2 - editorRect.left;
      
      setSelectedText(text);
      setPopupPosition({ top, left });
      setShowSelectionPopup(true);
      setSelectionRange(range);
    }
  };

  // Function to handle content change from rich text editor
  const handleContentChange = (content: string) => {
    setEditedContent(content);
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
        
        // Replace the selected text in the edited content with HTML-aware replacement
        const parser = new DOMParser();
        const doc = parser.parseFromString(editedContent, 'text/html');
        
        // Find all text nodes in the document
        const textNodes: Node[] = [];
        const findTextNodes = (node: Node) => {
          if (node.nodeType === Node.TEXT_NODE) {
            textNodes.push(node);
          } else {
            node.childNodes.forEach(child => findTextNodes(child));
          }
        };
        
        findTextNodes(doc.body);
        
        // Find the text node containing the selection
        let currentPosition = 0;
        let targetNode: Node | null = null;
        let startOffset = 0;
        
        for (const node of textNodes) {
          const nodeLength = node.textContent?.length || 0;
          if (currentPosition <= selectionRange.start && currentPosition + nodeLength >= selectionRange.end) {
            targetNode = node;
            startOffset = selectionRange.start - currentPosition;
            break;
          }
          currentPosition += nodeLength;
        }
        
        // Replace text in the found node
        if (targetNode && targetNode.textContent) {
          const before = targetNode.textContent.substring(0, startOffset);
          const after = targetNode.textContent.substring(startOffset + selectedText.length);
          targetNode.textContent = before + rewrittenSection + after;
        }
        
        // Get updated HTML and set as edited content
        setEditedContent(doc.body.innerHTML);
        
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

  return (
    <div id="document-content-section">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Document Content</h2>
      
      {/* Add Table of Contents */}
      {document.fullContent && !isEditing && (
        <TableOfContents 
          content={document.fullContent} 
          onNavigate={navigateToPosition}
        />
      )}
      
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
              
              {/* Replace contentEditable with RichTextEditor */}
              <RichTextEditor
                initialContent={document.fullContent}
                onChange={handleContentChange}
                onTextSelection={handleRichTextSelection}
                onSave={saveChanges}
                onCancel={cancelEditing}
              />
              
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
              <pre 
                ref={contentRef}
                className="whitespace-pre-wrap text-sm p-6"
              >
                {document.fullContent}
              </pre>
              
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
  );
};

export default DocumentContent; 
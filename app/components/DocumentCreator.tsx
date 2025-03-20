'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { createDocument, DocumentFormData, updateDocument } from '../firebase/firestore';
import ErrorHandler from './ErrorHandler';
import { db } from '../firebase/config';

// Define document type options
const DOCUMENT_TYPES = [
  { id: 'nda', name: 'Non-Disclosure Agreement' },
  { id: 'contract', name: 'Service Contract' },
  { id: 'employment', name: 'Employment Agreement' },
  { id: 'partnership', name: 'Partnership Agreement' },
  { id: 'tos', name: 'Terms of Service' }
];

// Define available templates for each document type
const DOCUMENT_TEMPLATES = {
  nda: [
    { id: 'standard', name: 'Standard NDA (Mutual)' },
    { id: 'one-way', name: 'One-Way NDA' },
    { id: 'startup', name: 'Startup-friendly NDA' }
  ],
  contract: [
    { id: 'basic', name: 'Basic Service Agreement' },
    { id: 'detailed', name: 'Detailed Service Contract' },
    { id: 'milestone', name: 'Milestone-Based Contract' }
  ],
  employment: [
    { id: 'full-time', name: 'Full-Time Employment' },
    { id: 'contractor', name: 'Independent Contractor' },
    { id: 'consultant', name: 'Consulting Agreement' }
  ],
  partnership: [
    { id: 'general', name: 'General Partnership' },
    { id: 'limited', name: 'Limited Partnership' },
    { id: 'joint-venture', name: 'Joint Venture' }
  ],
  tos: [
    { id: 'website', name: 'Website Terms of Service' },
    { id: 'app', name: 'Mobile App Terms of Service' },
    { id: 'saas', name: 'SaaS Terms of Service' }
  ]
};

// Sample prompts for each document type - made more concise
const DOCUMENT_PROMPTS = {
  nda: (title: string, details: string) => 
    `Create a Non-Disclosure Agreement titled "${title}". Details: ${details}. Include confidentiality, term, obligations, exclusions.`,
  
  contract: (title: string, details: string) => 
    `Create a Service Contract titled "${title}". Details: ${details}. Include scope, payment terms, deliverables, and termination.`,
  
  employment: (title: string, details: string) => 
    `Create an Employment Agreement titled "${title}". Details: ${details}. Include role, compensation, benefits, IP rights.`,
  
  partnership: (title: string, details: string) => 
    `Create a Partnership Agreement titled "${title}". Details: ${details}. Include structure, contributions, profit sharing, dissolution.`,
  
  tos: (title: string, details: string) => 
    `Create Terms of Service titled "${title}". Details: ${details}. Include user obligations, IP, limitations of liability.`
};

export const DocumentCreator: React.FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [showAIAssistance, setShowAIAssistance] = useState(false);
  const [isFirestoreReady, setIsFirestoreReady] = useState(false);
  const [isGeneratingFullDocument, setIsGeneratingFullDocument] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [availableTemplates, setAvailableTemplates] = useState<Array<{id: string, name: string}>>(
    DOCUMENT_TEMPLATES.nda
  );
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [formData, setFormData] = useState<DocumentFormData>({
    title: '',
    type: DOCUMENT_TYPES[0].id,
    description: '',
    counterpartyEmail: '',
    additionalDetails: '',
    template: DOCUMENT_TEMPLATES.nda[0].id
  });

  // Check if Firestore is ready
  useEffect(() => {
    const checkFirestore = () => {
      try {
        if (db) {
          console.log('Firestore DB initialized successfully');
          setIsFirestoreReady(true);
        } else {
          console.error('Firestore DB not initialized');
          setError(new Error('Database connection issue. Please try again later.'));
          // Try again in 1 second
          setTimeout(checkFirestore, 1000);
        }
      } catch (err) {
        console.error('Error checking Firestore:', err);
        setError(new Error('Error connecting to database. Please refresh the page.'));
      }
    };
    
    checkFirestore();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // If document type changed, update available templates and select the first one
    if (name === 'type') {
      const templates = DOCUMENT_TEMPLATES[value as keyof typeof DOCUMENT_TEMPLATES] || [];
      setAvailableTemplates(templates);
      setFormData(prev => ({ 
        ...prev, 
        [name]: value,
        template: templates.length > 0 ? templates[0].id : ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const generateDraftWithAI = async () => {
    setLoading(true);
    setError(null);
    
    try {
      setShowAIAssistance(true);
      
      // Get the appropriate prompt based on document type and template
      const documentType = formData.type;
      const templateId = formData.template;
      const promptGenerator = DOCUMENT_PROMPTS[documentType as keyof typeof DOCUMENT_PROMPTS];
      let prompt = promptGenerator(formData.title, formData.additionalDetails || 'Standard terms');
      
      // Add template information to the prompt
      if (templateId) {
        const selectedTemplate = availableTemplates.find(t => t.id === templateId);
        if (selectedTemplate) {
          prompt += ` Use the ${selectedTemplate.name} template.`;
        }
      }
      
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
      
      try {
        // Call LLM API to generate document
        const response = await fetch('/api/generate-document', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            prompt,
            documentType,
            title: formData.title
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(`Failed to generate document: ${errorData.error || response.statusText}`);
        }
        
        const data = await response.json();
        const generatedText = data.content;
        
        // Update form with AI-generated content
        setGeneratedContent(generatedText);
        setFormData(prev => ({
          ...prev,
          description: `AI-generated ${DOCUMENT_TYPES.find(type => type.id === documentType)?.name} with standard legal provisions based on the provided details.`
        }));
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          throw new Error('Document generation timed out. The server took too long to respond.');
        }
        throw fetchError;
      }
    } catch (err: any) {
      console.error('AI generation error:', err);
      // Fallback to simpler generation if API fails
      setFormData(prev => ({
        ...prev,
        description: `This is an AI-generated draft for a ${
          DOCUMENT_TYPES.find(type => type.id === formData.type)?.name
        } titled "${formData.title}". It includes standard clauses and protections for both parties.`
      }));
      
      setError(new Error(`Failed to generate complete document with AI: ${err.message || 'Unknown error'}. Using simplified draft instead.`));
    } finally {
      setLoading(false);
    }
  };

  const resetError = () => {
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    if (!isFirestoreReady) {
      setError(new Error('Database connection is not ready. Please try again later.'));
      setLoading(false);
      return;
    }
    
    try {
      if (!user) {
        throw new Error('You must be logged in to create a document');
      }
      
      // If no content has been generated yet, generate it now
      if (!generatedContent && !isGeneratingFullDocument) {
        setIsGeneratingFullDocument(true);
        
        try {
          // Get the appropriate prompt based on document type
          const documentType = formData.type;
          const promptGenerator = DOCUMENT_PROMPTS[documentType as keyof typeof DOCUMENT_PROMPTS];
          const prompt = promptGenerator(formData.title, formData.additionalDetails || 'Standard terms');
          
          // Create AbortController for timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 second timeout
          
          try {
            // Call LLM API to generate document
            const response = await fetch('/api/generate-document', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                prompt,
                documentType,
                title: formData.title
              }),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
              throw new Error(`Failed to generate document: ${errorData.error || response.statusText}`);
            }
            
            const data = await response.json();
            
            // Check if we got a diagnostic error
            if (data.diagnostic && data.diagnostic.isTimeout) {
              console.warn('Using fallback template due to API timeout');
            }
            
            setGeneratedContent(data.content);
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            
            if (fetchError.name === 'AbortError') {
              throw new Error('Document generation timed out. The server took too long to respond.');
            }
            throw fetchError;
          }
        } catch (err: any) {
          console.error('Document generation error:', err);
          
          // If the error is related to timeout, use a fallback template
          if (err.message && (err.message.includes('timed out') || err.message.includes('timeout'))) {
            console.log('Using fallback template due to timeout');
            const docType = formData.type;
            const templateText = `[USING FALLBACK TEMPLATE - AI GENERATION TIMED OUT]\n\n`;
            
            // Get the appropriate default template
            const fallbackTemplateRequest = await fetch('/api/generate-document', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                prompt: "Use fallback template",
                documentType: docType,
                title: formData.title
              }),
            });
            
            if (fallbackTemplateRequest.ok) {
              const templateData = await fallbackTemplateRequest.json();
              setGeneratedContent(templateText + templateData.content);
            } else {
              setError(new Error('Failed to generate document. Please try with a simpler request or try again later.'));
              setIsGeneratingFullDocument(false);
              setLoading(false);
              return;
            }
          } else {
            setError(new Error(`Failed to generate document: ${err.message || 'Unknown error'}`));
            setIsGeneratingFullDocument(false);
            setLoading(false);
            return;
          }
        }
      }
      
      const documentToSave = {
        ...formData,
        fullContent: generatedContent
      };
      
      console.log('Creating document with user:', user.uid, user.email);
      
      const documentId = await createDocument(
        user.uid,
        user.email,
        documentToSave
      );
      
      console.log('Document created with ID:', documentId);
      router.push(`/dashboard/documents/${documentId}`);
    } catch (err: any) {
      console.error('Document creation error:', err);
      setError(err instanceof Error ? err : new Error(`Failed to create document: ${err?.message || 'Unknown error'}`));
    } finally {
      setIsGeneratingFullDocument(false);
      setLoading(false);
    }
  };

  // Save the current form as a draft
  const saveDraft = async () => {
    if (!user) {
      setError(new Error('You must be logged in to save a draft'));
      return;
    }
    
    setIsSavingDraft(true);
    setError(null);
    
    try {
      // Prepare draft data
      const draftData: DocumentFormData = {
        ...formData,
        description: formData.description || `Draft document created on ${new Date().toLocaleDateString()}`,
        fullContent: generatedContent || ''
      };
      
      let savedDraftId: string;
      
      // If we have an existing draft, update it
      if (draftId) {
        await updateDocument(draftId, draftData);
        savedDraftId = draftId;
      } else {
        // Create a new draft document
        savedDraftId = await createDocument(
          user.uid,
          user.email,
          draftData
        );
        setDraftId(savedDraftId);
      }
      
      setDraftSaved(true);
      
      // Show success message briefly
      setTimeout(() => {
        setDraftSaved(false);
      }, 3000);
    } catch (err: any) {
      console.error('Draft saving error:', err);
      setError(err instanceof Error ? err : new Error(`Failed to save draft: ${err?.message || 'Unknown error'}`));
    } finally {
      setIsSavingDraft(false);
    }
  };

  return (
    <div className="max-w-3xl p-6 mx-auto bg-white rounded-lg shadow-md">
      <h2 className="mb-6 text-2xl font-bold text-gray-800">Create New Legal Document</h2>
      
      <ErrorHandler error={error} resetError={resetError} />
      
      {!isFirestoreReady && (
        <div className="p-4 mb-6 text-yellow-700 bg-yellow-100 border-l-4 border-yellow-500 rounded-md">
          <p>Database connection is being established. This may take a moment...</p>
        </div>
      )}
      
      {draftSaved && (
        <div className="p-4 mb-6 text-green-700 bg-green-100 border-l-4 border-green-500 rounded-md animate-fadeOut">
          <p>Draft saved successfully! You can continue editing.</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="title" className="block mb-2 text-sm font-medium text-gray-700">
            Document Title
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="E.g., Software Development Agreement with Acme Corp"
          />
        </div>
        
        <div>
          <label htmlFor="type" className="block mb-2 text-sm font-medium text-gray-700">
            Document Type
          </label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            {DOCUMENT_TYPES.map(type => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label htmlFor="template" className="block mb-2 text-sm font-medium text-gray-700">
            Document Template
          </label>
          <select
            id="template"
            name="template"
            value={formData.template}
            onChange={handleChange}
            required
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            {availableTemplates.map(template => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-sm text-gray-500">
            Select a template that best fits your needs. The AI will customize it based on your details.
          </p>
        </div>
        
        <div>
          <label htmlFor="counterpartyEmail" className="block mb-2 text-sm font-medium text-gray-700">
            Counterparty Email
          </label>
          <input
            type="email"
            id="counterpartyEmail"
            name="counterpartyEmail"
            value={formData.counterpartyEmail}
            onChange={handleChange}
            required
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="contact@counterparty.com"
          />
        </div>
        
        <div>
          <label htmlFor="additionalDetails" className="block mb-2 text-sm font-medium text-gray-700">
            Additional Details & Requirements
          </label>
          <textarea
            id="additionalDetails"
            name="additionalDetails"
            value={formData.additionalDetails}
            onChange={handleChange}
            rows={5}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Describe specific terms, conditions, parties involved, or any special requirements for this agreement"
          />
          <p className="mt-1 text-sm text-gray-500">
            These details will be used by the AI to generate your custom document.
          </p>
        </div>
        
        <div className="p-4 bg-indigo-50 rounded-md">
          <h3 className="mb-2 text-sm font-medium text-indigo-800">AI Document Generation</h3>
          <p className="mb-4 text-sm text-indigo-600">
            You can preview the AI-generated document before saving, or create the document directly. 
            The AI will use the details you provided to generate a complete legal document.
          </p>
          
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={generateDraftWithAI}
              disabled={loading || !formData.title || !formData.type}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-md shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {loading && !isGeneratingFullDocument ? 'Generating Preview...' : 'Generate Preview'}
            </button>
            
            <button
              type="button"
              onClick={saveDraft}
              disabled={loading || isSavingDraft || !formData.title || !formData.type}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md shadow-sm hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              {isSavingDraft ? 'Saving...' : draftId ? 'Update Draft' : 'Save as Draft'}
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading && isGeneratingFullDocument ? 'Generating Document...' : 'Create Document'}
            </button>
          </div>
        </div>
        
        {generatedContent && (
          <div className="p-4 border border-gray-200 rounded-md">
            <h3 className="mb-2 text-lg font-medium text-gray-900">Document Preview</h3>
            <div className="p-4 overflow-auto prose max-h-96 bg-gray-50">
              <pre className="whitespace-pre-wrap text-sm">{generatedContent}</pre>
            </div>
          </div>
        )}
        
        {showAIAssistance && !generatedContent && (
          <div className="flex items-center justify-center p-8">
            <div className="w-12 h-12 border-4 border-t-4 border-gray-200 rounded-full border-t-indigo-500 animate-spin"></div>
            <p className="ml-3 text-gray-700">The AI is generating your document...</p>
          </div>
        )}
      </form>
    </div>
  );
};

export default DocumentCreator; 
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { createDocument, DocumentFormData } from '../firebase/firestore';
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

// Sample prompts for each document type
const DOCUMENT_PROMPTS = {
  nda: (title: string, details: string) => 
    `Generate a comprehensive Non-Disclosure Agreement titled "${title}" with the following details: ${details}. Include standard clauses for confidentiality, term, obligations, exclusions, and remedies. Format it as a professional legal document with numbered sections.`,
  
  contract: (title: string, details: string) => 
    `Generate a detailed Service Contract titled "${title}" with the following specifications: ${details}. Include sections for scope of work, payment terms, timeline, deliverables, warranties, limitations of liability, and termination conditions. Format as a professional legal document with numbered sections.`,
  
  employment: (title: string, details: string) => 
    `Generate a comprehensive Employment Agreement titled "${title}" with these details: ${details}. Include sections for role responsibilities, compensation, benefits, work hours, confidentiality, intellectual property, termination conditions, and non-compete clauses. Format as a professional legal document with numbered sections.`,
  
  partnership: (title: string, details: string) => 
    `Generate a detailed Partnership Agreement titled "${title}" with these specifications: ${details}. Include sections for partnership structure, capital contributions, profit/loss sharing, management responsibilities, decision making, dispute resolution, and dissolution procedures. Format as a professional legal document with numbered sections.`,
  
  tos: (title: string, details: string) => 
    `Generate comprehensive Terms of Service titled "${title}" with these requirements: ${details}. Include sections for service description, user obligations, intellectual property, prohibited activities, warranties, limitations of liability, dispute resolution, and modification terms. Format as a professional legal document with numbered sections.`
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
  const [formData, setFormData] = useState<DocumentFormData>({
    title: '',
    type: DOCUMENT_TYPES[0].id,
    description: '',
    counterpartyEmail: '',
    additionalDetails: ''
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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generateDraftWithAI = async () => {
    setLoading(true);
    setError(null);
    
    try {
      setShowAIAssistance(true);
      
      // Get the appropriate prompt based on document type
      const documentType = formData.type;
      const promptGenerator = DOCUMENT_PROMPTS[documentType as keyof typeof DOCUMENT_PROMPTS];
      const prompt = promptGenerator(formData.title, formData.additionalDetails || 'Standard terms');
      
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
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate document. API returned an error.');
      }
      
      const data = await response.json();
      const generatedText = data.content;
      
      // Update form with AI-generated content
      setGeneratedContent(generatedText);
      setFormData(prev => ({
        ...prev,
        description: `AI-generated ${DOCUMENT_TYPES.find(type => type.id === documentType)?.name} with standard legal provisions based on the provided details.`
      }));
    } catch (err) {
      console.error('AI generation error:', err);
      // Fallback to simpler generation if API fails
      setFormData(prev => ({
        ...prev,
        description: `This is an AI-generated draft for a ${
          DOCUMENT_TYPES.find(type => type.id === formData.type)?.name
        } titled "${formData.title}". It includes standard clauses and protections for both parties.`
      }));
      
      setError(new Error('Failed to generate complete document with AI. Using simplified draft instead.'));
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
          });
          
          if (!response.ok) {
            throw new Error('Failed to generate document. API returned an error.');
          }
          
          const data = await response.json();
          setGeneratedContent(data.content);
        } catch (err) {
          console.error('Document generation error:', err);
          setError(new Error('Failed to generate complete document with LLM. Please try again or generate draft first.'));
          setIsGeneratingFullDocument(false);
          setLoading(false);
          return;
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
    } catch (err) {
      console.error('Document creation error:', err);
      setError(err instanceof Error ? err : new Error('Failed to create document. Please try again.'));
    } finally {
      setIsGeneratingFullDocument(false);
      setLoading(false);
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
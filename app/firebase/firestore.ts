import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  DocumentData as FirestoreDocumentData,
  QueryDocumentSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from './config';

// Document types
export interface DocumentFormData {
  title: string;
  type: string;
  description: string;
  counterpartyEmail: string;
  additionalDetails: string;
  fullContent?: string;
}

export interface DocumentData extends DocumentFormData {
  id: string;
  createdBy: string;
  createdAt: Timestamp;
  status: 'draft' | 'sent' | 'negotiating' | 'approved' | 'signed' | 'completed' | 'archived';
  collaborators: Array<{
    email: string;
    role: 'owner' | 'counterparty' | 'viewer';
  }>;
  fullContent: string;
  lastModified?: Timestamp;
  version?: number;
  signatures?: Array<{
    userId: string;
    email: string;
    name: string;
    signatureImage: string;
    timestamp: Timestamp | Date;
    role: 'owner' | 'counterparty';
    ipAddress?: string;
  }>;
}

// Document CRUD operations
export const createDocument = async (
  userId: string,
  userEmail: string | null,
  data: DocumentFormData
): Promise<string> => {
  try {
    if (!db) {
      throw new Error('Firestore is not initialized');
    }
    
    const documentsRef = collection(db, 'documents');
    
    const docRef = await addDoc(documentsRef, {
      ...data,
      createdBy: userId,
      createdAt: serverTimestamp(),
      status: 'draft',
      collaborators: [
        { email: userEmail, role: 'owner' },
        { email: data.counterpartyEmail, role: 'counterparty' }
      ]
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating document:', error);
    throw error;
  }
};

export const getUserDocuments = async (
  userId: string,
  status?: string,
  lastDoc?: QueryDocumentSnapshot<DocumentData>,
  pageSize: number = 10
): Promise<{
  documents: DocumentData[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
}> => {
  try {
    if (!db) {
      throw new Error('Firestore is not initialized');
    }
    
    const documentsRef = collection(db, 'documents');
    
    let q = query(
      documentsRef,
      where('createdBy', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    if (status) {
      q = query(q, where('status', '==', status));
    }
    
    if (lastDoc) {
      q = query(q, startAfter(lastDoc), limit(pageSize));
    } else {
      q = query(q, limit(pageSize));
    }
    
    const querySnapshot = await getDocs(q);
    const documents: DocumentData[] = [];
    let lastVisible: QueryDocumentSnapshot<DocumentData> | null = null;
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as Omit<DocumentData, 'id'>;
      documents.push({
        ...data,
        id: doc.id
      } as DocumentData);
      lastVisible = doc as QueryDocumentSnapshot<DocumentData>;
    });
    
    return {
      documents,
      lastDoc: lastVisible
    };
  } catch (error) {
    console.error('Error getting user documents:', error);
    throw error;
  }
};

export const getSharedDocuments = async (
  userEmail: string,
  status?: string,
  lastDoc?: QueryDocumentSnapshot<DocumentData>,
  pageSize: number = 10
): Promise<{
  documents: DocumentData[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
}> => {
  try {
    if (!db) {
      throw new Error('Firestore is not initialized');
    }
    
    const documentsRef = collection(db, 'documents');
    
    let q = query(
      documentsRef,
      where('collaborators', 'array-contains', { email: userEmail, role: 'counterparty' }),
      orderBy('createdAt', 'desc')
    );
    
    if (status) {
      q = query(q, where('status', '==', status));
    }
    
    if (lastDoc) {
      q = query(q, startAfter(lastDoc), limit(pageSize));
    } else {
      q = query(q, limit(pageSize));
    }
    
    const querySnapshot = await getDocs(q);
    const documents: DocumentData[] = [];
    let lastVisible: QueryDocumentSnapshot<DocumentData> | null = null;
    
    querySnapshot.forEach((doc) => {
      const data = doc.data() as Omit<DocumentData, 'id'>;
      documents.push({
        ...data,
        id: doc.id
      } as DocumentData);
      lastVisible = doc as QueryDocumentSnapshot<DocumentData>;
    });
    
    return {
      documents,
      lastDoc: lastVisible
    };
  } catch (error) {
    console.error('Error getting shared documents:', error);
    throw error;
  }
};

export const getDocument = async (documentId: string): Promise<DocumentData | null> => {
  try {
    if (!db) {
      throw new Error('Firestore is not initialized');
    }
    
    const docRef = doc(db, 'documents', documentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data() as Omit<DocumentData, 'id'>;
      return {
        ...data,
        id: docSnap.id
      } as DocumentData;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting document:', error);
    throw error;
  }
};

export const updateDocument = async (
  documentId: string,
  data: Partial<DocumentFormData>
): Promise<void> => {
  try {
    if (!db) {
      throw new Error('Firestore is not initialized');
    }
    
    const docRef = doc(db, 'documents', documentId);
    await updateDoc(docRef, {
      ...data,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating document:', error);
    throw error;
  }
};

export const updateDocumentStatus = async (
  documentId: string,
  status: DocumentData['status']
): Promise<void> => {
  try {
    if (!db) {
      throw new Error('Firestore is not initialized');
    }
    
    const docRef = doc(db, 'documents', documentId);
    await updateDoc(docRef, {
      status,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating document status:', error);
    throw error;
  }
};

export const deleteDocument = async (documentId: string): Promise<void> => {
  try {
    if (!db) {
      throw new Error('Firestore is not initialized');
    }
    
    const docRef = doc(db, 'documents', documentId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

export const addCollaborator = async (
  documentId: string,
  email: string,
  role: 'counterparty' | 'viewer'
): Promise<void> => {
  try {
    if (!db) {
      throw new Error('Firestore is not initialized');
    }
    
    const docRef = doc(db, 'documents', documentId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const collaborators = data.collaborators || [];
      
      // Check if collaborator already exists
      const existingIndex = collaborators.findIndex((c: any) => c.email === email);
      
      if (existingIndex >= 0) {
        // Update existing collaborator role
        collaborators[existingIndex].role = role;
      } else {
        // Add new collaborator
        collaborators.push({ email, role });
      }
      
      await updateDoc(docRef, {
        collaborators,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error adding collaborator:', error);
    throw error;
  }
};

// Add a new function to add a signature to a document
export const addSignatureToDocument = async (
  documentId: string,
  signature: {
    userId: string;
    email: string;
    name: string;
    signatureImage: string;
    role: 'owner' | 'counterparty';
    ipAddress?: string;
  }
): Promise<void> => {
  try {
    if (!db) {
      throw new Error('Firestore is not initialized');
    }
    
    const docRef = doc(db, 'documents', documentId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      throw new Error('Document not found');
    }
    
    const documentData = docSnap.data();
    const existingSignatures = documentData.signatures || [];
    
    // Get current time
    const currentTime = new Date();
    
    // Check if this user has already signed
    const existingSignatureIndex = existingSignatures.findIndex(
      (s: any) => s.userId === signature.userId
    );
    
    let newSignatures;
    if (existingSignatureIndex >= 0) {
      // Update existing signature
      newSignatures = [...existingSignatures];
      newSignatures[existingSignatureIndex] = {
        ...signature,
        timestamp: currentTime
      };
    } else {
      // Add new signature
      newSignatures = [
        ...existingSignatures,
        {
          ...signature,
          timestamp: currentTime
        }
      ];
    }
    
    // Update the document with the new signature and change status if appropriate
    let status = documentData.status;
    
    // Check if both owner and counterparty have signed
    const hasOwnerSigned = newSignatures.some((s: any) => s.role === 'owner');
    const hasCounterpartySigned = newSignatures.some((s: any) => s.role === 'counterparty');
    
    if (hasOwnerSigned && hasCounterpartySigned) {
      status = 'signed';
    } else if (status === 'draft' || status === 'sent') {
      status = 'negotiating';
    }
    
    // Update signatures and status
    await updateDoc(docRef, {
      signatures: newSignatures,
      status
    });
    
    // Update lastModified in a separate operation to avoid putting serverTimestamp in an array
    await updateDoc(docRef, {
      lastModified: serverTimestamp()
    });
    
  } catch (error) {
    console.error('Error adding signature:', error);
    throw error;
  }
};

// Function to check if a document has been signed by a specific user
export const hasUserSignedDocument = async (
  documentId: string,
  userId: string
): Promise<boolean> => {
  try {
    if (!db) {
      throw new Error('Firestore is not initialized');
    }
    
    const docRef = doc(db, 'documents', documentId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return false;
    }
    
    const documentData = docSnap.data();
    const signatures = documentData.signatures || [];
    
    return signatures.some((signature: any) => signature.userId === userId);
  } catch (error) {
    console.error('Error checking if user signed document:', error);
    return false;
  }
}; 
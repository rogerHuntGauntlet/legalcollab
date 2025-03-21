import { useCallback } from 'react';

export default function useUtilityFunctions() {
  const getDocumentTypeLabel = useCallback((type: string) => {
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
  }, []);

  const formatTimestamp = useCallback((timestamp: any): string => {
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
  }, []);

  return {
    getDocumentTypeLabel,
    formatTimestamp
  };
} 
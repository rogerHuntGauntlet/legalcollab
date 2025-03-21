import React, { useState } from 'react';

interface CollaboratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCollaborator: (email: string, role: 'counterparty' | 'viewer') => Promise<boolean>;
}

const CollaboratorModal: React.FC<CollaboratorModalProps> = ({
  isOpen,
  onClose,
  onAddCollaborator
}) => {
  const [newCollaboratorEmail, setNewCollaboratorEmail] = useState('');
  const [newCollaboratorRole, setNewCollaboratorRole] = useState<'counterparty' | 'viewer'>('viewer');
  const [addingCollaborator, setAddingCollaborator] = useState(false);

  if (!isOpen) return null;

  const handleAddCollaborator = async () => {
    if (!newCollaboratorEmail.trim()) return;
    
    setAddingCollaborator(true);
    const success = await onAddCollaborator(newCollaboratorEmail, newCollaboratorRole);
    
    if (success) {
      // Clear the form
      setNewCollaboratorEmail('');
      setNewCollaboratorRole('viewer');
      onClose();
    }
    
    setAddingCollaborator(false);
  };

  return (
    <div className="fixed inset-0 z-10 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" aria-hidden="true" onClick={onClose}></div>
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
              onClick={onClose}
              className="inline-flex justify-center w-full px-4 py-2 mt-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollaboratorModal; 
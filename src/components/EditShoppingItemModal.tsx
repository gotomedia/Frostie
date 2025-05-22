import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { ShoppingItem } from '../types';
import { getCategories } from '../data/categories';
import useFocusTrap from '../hooks/useFocusTrap';

interface EditShoppingItemModalProps {
  item: ShoppingItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedItem: ShoppingItem) => void;
  categories: string[];
}

const EditShoppingItemModal: React.FC<EditShoppingItemModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
  categories: propCategories
}) => {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [completed, setCompleted] = useState(item.completed);
  
  // Use focus trap for keyboard navigation
  const focusTrapRef = useFocusTrap(isOpen);
  
  // Get all available categories
  const allCategories = propCategories.length > 0 
    ? propCategories 
    : getCategories();

  useEffect(() => {
    if (isOpen) {
      setName(item.name);
      setCategory(item.category);
      setCompleted(item.completed);
    }
  }, [isOpen, item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedItem: ShoppingItem = {
      ...item,
      name,
      category,
      completed
    };

    onSave(updatedItem);
    onClose();
  };
  
  // Handle escape key press to close the modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);
  
  // Listen for the custom event from the focus trap hook
  useEffect(() => {
    const handleCloseFocusTrap = () => {
      if (isOpen) onClose();
    };
    
    document.addEventListener('closeFocusTrap', handleCloseFocusTrap);
    return () => {
      document.removeEventListener('closeFocusTrap', handleCloseFocusTrap);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  
  const modalId = `edit-shopping-item-${item.id}`;
  const modalTitleId = `${modalId}-title`;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={modalTitleId}
    >
      <div 
        ref={focusTrapRef}
        className="bg-white dark:bg-slate-800 rounded-lg shadow-lg w-full max-w-md relative"
        tabIndex={-1}
      >
        <button 
          onClick={onClose} 
          className="absolute right-4 top-4 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
          aria-label="Close dialog"
        >
          <X size={20} aria-hidden="true" />
        </button>
        
        <div className="p-6">
          <h2 id={modalTitleId} className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">Edit Shopping Item</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label htmlFor={`name-${item.id}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Item Name
                </label>
                <input
                  type="text"
                  id={`name-${item.id}`}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  required
                />
              </div>
              
              <div>
                <label htmlFor={`category-${item.id}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Category
                </label>
                <select
                  id={`category-${item.id}`}
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  aria-label="Item category"
                >
                  {allCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id={`completed-${item.id}`}
                  checked={completed}
                  onChange={(e) => setCompleted(e.target.checked)}
                  className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus-visible:ring-blue-500 dark:bg-slate-700"
                />
                <label htmlFor={`completed-${item.id}`} className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                  Completed
                </label>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditShoppingItemModal;
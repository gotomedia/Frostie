import React, { useState, useEffect } from 'react';
import { X, Calendar, Tag, Plus, XCircle, Image } from 'lucide-react';
import { FreezerItem } from '../types';
import AccessibleDatepicker from './AccessibleDatepicker';
import { getCategories } from '../data/categories';
import useFocusTrap from '../hooks/useFocusTrap';

interface EditFreezerItemModalProps {
  item: FreezerItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedItem: FreezerItem) => void;
  categories: string[];
  source?: 'text' | 'voice' | 'image' | 'barcode' | 'manual'; // Added source prop
}

const EditFreezerItemModal: React.FC<EditFreezerItemModalProps> = ({
  item,
  isOpen,
  onClose,
  onSave,
  categories: propCategories,
  source = 'manual' // Default to 'manual' if not specified
}) => {
  const [name, setName] = useState(item.name);
  const [category, setCategory] = useState(item.category);
  const [quantity, setQuantity] = useState(item.quantity);
  const [size, setSize] = useState(item.size || '');
  const [expirationDate, setExpirationDate] = useState(new Date(item.expirationDate));
  const [notes, setNotes] = useState(item.notes);
  const [tags, setTags] = useState<string[]>(item.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [imageUrl, setImageUrl] = useState(item.imageUrl || '');

  // Use the focus trap hook for keyboard navigation
  const focusTrapRef = useFocusTrap(isOpen);

  // Get all available categories
  const allCategories = propCategories.length > 0 
    ? propCategories 
    : getCategories();

  // Check if the image field should be shown
  const showImageField = source === 'image' || source === 'barcode' || source === 'manual' || !!item.imageUrl;

  useEffect(() => {
    // Initialize the state when the modal opens
    if (isOpen) {
      setName(item.name);
      setCategory(item.category);
      setQuantity(item.quantity);
      setSize(item.size || '');
      setExpirationDate(new Date(item.expirationDate));
      setNotes(item.notes);
      setTags(item.tags || []);
      setImageUrl(item.imageUrl || '');
      setTagInput('');
    }
  }, [isOpen, item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updatedItem: FreezerItem = {
      ...item,
      name,
      category,
      quantity,
      size,
      expirationDate,
      tags,
      notes,
      imageUrl
    };

    onSave(updatedItem);
    onClose();
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
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
  
  const modalId = `edit-freezer-item-${item.id}`;
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
          <h2 id={modalTitleId} className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-100">Edit Item</h2>
          
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
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor={`quantity-${item.id}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    id={`quantity-${item.id}`}
                    value={quantity}
                    min="1"
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  />
                </div>
                
                <div>
                  <label htmlFor={`size-${item.id}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Size
                  </label>
                  <input
                    type="text"
                    id={`size-${item.id}`}
                    value={size}
                    placeholder="e.g., 500g, 1lb, 2oz"
                    onChange={(e) => setSize(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  />
                </div>
              </div>
              
              <div>
                <AccessibleDatepicker
                  id={`expirationDate-${item.id}`}
                  label="Expiration Date"
                  selectedDate={expirationDate}
                  onChange={setExpirationDate}
                  minDate={new Date()}
                />
              </div>
              
              {showImageField && (
                <div>
                  <label htmlFor={`imageUrl-${item.id}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Item Image
                  </label>
                  <div className="flex items-center">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        id={`imageUrl-${item.id}`}
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="hidden w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                        aria-label="Image URL"
                      />
                      <Image className="absolute right-3 top-2.5 text-slate-400 dark:text-slate-500" size={16} aria-hidden="true" />
                    </div>
                  </div>
                  {imageUrl && (
                    <div className="mt-2">
                      <div className="relative w-full h-32 bg-slate-100 dark:bg-slate-700 rounded-md overflow-hidden">
                        <img 
                          src={imageUrl} 
                          alt={`${name} preview`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // If image fails to load, hide it
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div>
                <label htmlFor={`tags-${item.id}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tags
                </label>
                <div className="flex items-center">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      id={`tags-${item.id}`}
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={handleTagInputKeyDown}
                      placeholder="Add tags (press Enter)"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                      aria-describedby={`tags-help-${item.id}`}
                    />
                    <Tag className="absolute right-3 top-2.5 text-slate-400 dark:text-slate-500" size={16} aria-hidden="true" />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="ml-2 p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label="Add tag"
                  >
                    <Plus size={16} aria-hidden="true" />
                  </button>
                </div>
                <p id={`tags-help-${item.id}`} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Add descriptive tags to help organize your items
                </p>
                
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2" role="list" aria-label="Current tags">
                    {tags.map((tag, index) => (
                      <div 
                        key={index} 
                        className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full text-xs"
                        role="listitem"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-full"
                          aria-label={`Remove tag ${tag}`}
                        >
                          <XCircle size={14} aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <label htmlFor={`notes-${item.id}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notes (optional)
                </label>
                <textarea
                  id={`notes-${item.id}`}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 dark:bg-slate-700 dark:text-slate-100"
                  aria-describedby={`notes-help-${item.id}`}
                />
                <p id={`notes-help-${item.id}`} className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Add any additional information about this item
                </p>
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

export default EditFreezerItemModal;
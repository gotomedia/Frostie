import React, { useState } from 'react';
import { ShoppingCart, PlusCircle } from 'lucide-react';
import ShoppingItemComponent from '../components/ShoppingItem';
import EmptyState from '../components/EmptyState';
import EditShoppingItemModal from '../components/EditShoppingItemModal';
import { ShoppingItem } from '../types';
import { getCategories } from '../data/categories';

interface ShoppingPageProps {
  shoppingItems: ShoppingItem[];
  onAddItem: (value: string) => void;
  onToggleItem: (id: string) => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem?: (item: ShoppingItem) => void;
}

const ShoppingPage: React.FC<ShoppingPageProps> = ({
  shoppingItems,
  onAddItem,
  onToggleItem,
  onRemoveItem,
  onUpdateItem
}) => {
  const [newItem, setNewItem] = useState('');
  const [showCompleted, setShowCompleted] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState<ShoppingItem | null>(null);
  
  // Get predefined categories
  const predefinedCategories = getCategories();
  
  // Get all unique categories from items
  const usedCategories = [...new Set(shoppingItems.map(item => item.category))];
  
  // Combine and deduplicate categories
  const categories = [...new Set([...predefinedCategories, ...usedCategories])];
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.trim()) {
      onAddItem(newItem);
      setNewItem('');
    }
  };
  
  // Handle edit item
  const handleEditItem = (item: ShoppingItem) => {
    setCurrentEditItem(item);
    setIsEditModalOpen(true);
  };

  // Handle save edited item
  const handleSaveEditedItem = (updatedItem: ShoppingItem) => {
    if (onUpdateItem) {
      onUpdateItem(updatedItem);
    }
    setIsEditModalOpen(false);
    setCurrentEditItem(null);
  };
  
  const filteredItems = showCompleted 
    ? shoppingItems 
    : shoppingItems.filter(item => !item.completed);
  
  const incompleteCount = shoppingItems.filter(item => !item.completed).length;
  const completedCount = shoppingItems.filter(item => item.completed).length;

  return (
    <div className="pb-16 md:pb-4"> {/* Padding to accommodate mobile nav */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">Shopping List</h2>
        
        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newItem}
            onChange={e => setNewItem(e.target.value)}
            placeholder="Add item to shopping list..."
            className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusCircle size={20} />
          </button>
        </form>
      </section>

      <section>
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm dark:text-slate-300">
            <span className="font-medium">{incompleteCount}</span> items remaining
            {completedCount > 0 && (
              <span className="ml-2 text-slate-500 dark:text-slate-400">({completedCount} completed)</span>
            )}
          </div>
          
          <label className="flex items-center text-sm cursor-pointer text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={() => setShowCompleted(!showCompleted)}
              className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 mr-2 dark:bg-slate-700"
            />
            Show completed
          </label>
        </div>
        
        {filteredItems.length > 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700">
            {filteredItems.map(item => (
              <ShoppingItemComponent
                key={item.id}
                item={item}
                onToggle={onToggleItem}
                onRemove={onRemoveItem}
                onEdit={handleEditItem}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="Your shopping list is empty"
            description={showCompleted
              ? "Add items using the input above"
              : "You have no incomplete items, toggle 'Show completed' to see completed items"
            }
            icon={<ShoppingCart size={32} />}
          />
        )}
      </section>
      
      {currentEditItem && (
        <EditShoppingItemModal 
          item={currentEditItem}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveEditedItem}
          categories={categories}
        />
      )}
    </div>
  );
};

export default ShoppingPage;
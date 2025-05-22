import React, { useState, useMemo, useCallback } from 'react';
import { ShoppingCart, PlusCircle } from 'lucide-react';
import ShoppingItemComponent from '../components/ShoppingItem';
import EmptyState from '../components/EmptyState';
import EditShoppingItemModal from '../components/EditShoppingItemModal';
import LoadingTransition from '../components/LoadingTransition';
import { ShoppingItem } from '../types';
import { getCategories } from '../data/categories';
import { useStorage } from '../store/StorageContext';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';

const ShoppingPage: React.FC = () => {
  const { shoppingItems } = useStorage();
  const [newItem, setNewItem] = useState('');
  const [showCompleted, setShowCompleted] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState<ShoppingItem | null>(null);
  
  // Get predefined categories
  const predefinedCategories = getCategories();
  
  // Get all unique categories from items - memoize to prevent recalculation
  const usedCategories = useMemo(() => 
    [...new Set(shoppingItems.items.map(item => item.category))],
    [shoppingItems.items]
  );
  
  // Combine and deduplicate categories - memoize result
  const categories = useMemo(() => 
    [...new Set([...predefinedCategories, ...usedCategories])],
    [predefinedCategories, usedCategories]
  );
  
  // Handle form submission - wrapped in useCallback
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.trim()) {
      try {
        const item: ShoppingItem = {
          id: uuidv4(),
          name: newItem.trim(),
          completed: false,
          category: guessCategory(newItem.trim()),
        };
        
        await shoppingItems.addItem(item);
        toast.success(`Added ${newItem} to shopping list`);
        setNewItem('');
      } catch (error) {
        console.error('Error adding shopping item:', error);
        toast.error('Failed to add item to shopping list');
      }
    }
  }, [newItem, shoppingItems]);
  
  // Handle toggle item complete/incomplete - wrapped in useCallback
  const handleToggleItem = useCallback(async (id: string) => {
    const item = shoppingItems.items.find(item => item.id === id);
    if (!item) return;
    
    try {
      const updatedItem = { ...item, completed: !item.completed };
      await shoppingItems.updateItem(updatedItem);
    } catch (error) {
      console.error('Error toggling shopping item:', error);
      toast.error('Failed to update item');
    }
  }, [shoppingItems]);
  
  // Handle edit item - wrapped in useCallback
  const handleEditItem = useCallback((item: ShoppingItem) => {
    setCurrentEditItem(item);
    setIsEditModalOpen(true);
  }, []);

  // Handle save edited item - wrapped in useCallback
  const handleSaveEditedItem = useCallback(async (updatedItem: ShoppingItem) => {
    try {
      await shoppingItems.updateItem(updatedItem);
      toast.success(`Updated ${updatedItem.name}`);
    } catch (error) {
      console.error('Error updating shopping item:', error);
      toast.error('Failed to update shopping item');
    } finally {
      setIsEditModalOpen(false);
      setCurrentEditItem(null);
    }
  }, [shoppingItems]);
  
  // Handle remove item - wrapped in useCallback
  const handleRemoveItem = useCallback(async (id: string) => {
    const item = shoppingItems.items.find(item => item.id === id);
    if (!item) return;
    
    try {
      await shoppingItems.deleteItem(id);
      toast.success(`Removed ${item.name} from shopping list`);
    } catch (error) {
      console.error('Error removing shopping item:', error);
      toast.error('Failed to remove item');
    }
  }, [shoppingItems]);
  
  // Guess category based on item name - wrapped in useCallback
  const guessCategory = useCallback((itemName: string): string => {
    const lowerCaseName = itemName.toLowerCase();
    if (lowerCaseName.includes('meat') || lowerCaseName.includes('chicken') || 
        lowerCaseName.includes('beef') || lowerCaseName.includes('pork') || 
        lowerCaseName.includes('turkey') || lowerCaseName.includes('lamb')) {
      return 'Meat & Poultry';
    } else if (lowerCaseName.includes('fish') || lowerCaseName.includes('shrimp') || 
               lowerCaseName.includes('seafood') || lowerCaseName.includes('scallop')) {
      return 'Seafood';
    } else if (lowerCaseName.includes('vegetable') || lowerCaseName.includes('veg') || 
               lowerCaseName.includes('fruit') || lowerCaseName.includes('berry')) {
      return 'Fruits & Vegetables';
    } else if (lowerCaseName.includes('leftover') || lowerCaseName.includes('meal prep')) {
      return 'Prepared Meals';
    } else if (lowerCaseName.includes('dinner') || lowerCaseName.includes('pizza') || 
               lowerCaseName.includes('breakfast')) {
      return 'Ready-to-Eat';
    } else if (lowerCaseName.includes('bread') || lowerCaseName.includes('dough') || 
               lowerCaseName.includes('pastry')) {
      return 'Bakery & Bread';
    } else if (lowerCaseName.includes('ice cream') || lowerCaseName.includes('butter') || 
               lowerCaseName.includes('cheese') || lowerCaseName.includes('milk')) {
      return 'Dairy & Alternatives';
    } else if (lowerCaseName.includes('soup') || lowerCaseName.includes('broth') || 
               lowerCaseName.includes('stock')) {
      return 'Soups & Broths';
    } else if (lowerCaseName.includes('herb') || lowerCaseName.includes('spice') || 
               lowerCaseName.includes('season')) {
      return 'Herbs & Seasonings';
    }
    return 'Other';
  }, []);
  
  // Filter items based on the completed status filter - memoize to prevent recalculation
  const filteredItems = useMemo(() => 
    showCompleted 
      ? shoppingItems.items 
      : shoppingItems.items.filter(item => !item.completed),
    [shoppingItems.items, showCompleted]
  );
  
  // Calculate counts - memoize to prevent recalculation
  const incompleteCount = useMemo(() => 
    shoppingItems.items.filter(item => !item.completed).length,
    [shoppingItems.items]
  );
  
  const completedCount = useMemo(() => 
    shoppingItems.items.filter(item => item.completed).length,
    [shoppingItems.items]
  );

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
        
        <LoadingTransition loading={shoppingItems.loading}>
          {filteredItems.length > 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700">
              {filteredItems.map(item => (
                <ShoppingItemComponent
                  key={item.id}
                  item={item}
                  onToggle={handleToggleItem}
                  onRemove={handleRemoveItem}
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
        </LoadingTransition>
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
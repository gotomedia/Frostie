import React, { useState } from 'react';
import { Filter, Search, RefrigeratorIcon } from 'lucide-react';
import UniversalInputBar from '../components/UniversalInputBar';
import FreezerItemCard from '../components/FreezerItemCard';
import EmptyState from '../components/EmptyState';
import EditFreezerItemModal from '../components/EditFreezerItemModal';
import { FreezerItem } from '../types';
import { getCategories } from '../data/categories';

interface FreezerPageProps {
  freezerItems: FreezerItem[];
  onAddItem: (value: string) => void;
  onImageUpload: (file: File) => Promise<void> | void;
  onBarcodeScanned: (barcode: string) => void;
  onVoiceInput: (transcript: string) => void;
  onRemoveItem: (id: string) => void;
  onUpdateItem?: (item: FreezerItem) => void;
}

const FreezerPage: React.FC<FreezerPageProps> = ({
  freezerItems,
  onAddItem,
  onImageUpload,
  onBarcodeScanned,
  onVoiceInput,
  onRemoveItem,
  onUpdateItem
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'expiration' | 'category'>('expiration');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState<FreezerItem | null>(null);

  // Get all predefined categories
  const predefinedCategories = getCategories();

  // Get all unique categories from items
  const usedCategories = [...new Set(freezerItems.map(item => item.category))];
  
  // Combine and deduplicate categories
  const categories = [...new Set([...predefinedCategories, ...usedCategories])];

  // Handle edit item
  const handleEditItem = (item: FreezerItem) => {
    setCurrentEditItem(item);
    setIsEditModalOpen(true);
  };

  // Handle save edited item
  const handleSaveEditedItem = (updatedItem: FreezerItem) => {
    if (onUpdateItem) {
      onUpdateItem(updatedItem);
    }
    setIsEditModalOpen(false);
    setCurrentEditItem(null);
  };

  // Filter and sort items
  const filteredItems = freezerItems
    .filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory ? item.category === filterCategory : true;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'expiration') {
        return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
      } else if (sortBy === 'category') {
        return a.category.localeCompare(b.category);
      }
      return 0;
    });

  return (
    <div className="pb-16 md:pb-4"> {/* Padding to accommodate mobile nav */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">Freezer Inventory</h2>
        <div className="mb-6">
          <UniversalInputBar
            onSubmit={onAddItem}
            onImageUpload={onImageUpload}
            onBarcodeScanned={onBarcodeScanned}
            onVoiceInput={onVoiceInput}
            placeholder="Add item to freezer..."
          />
        </div>
      </section>

      <section className="mb-6">
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-slate-400 dark:text-slate-500" />
            </div>
            <input
              type="text"
              placeholder="Search items..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as 'name' | 'expiration' | 'category')}
              className="px-4 pr-8 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              aria-label="Sort by"
            >
              <option value="expiration">Sort by: Expiration</option>
              <option value="name">Sort by: Name</option>
              <option value="category">Sort by: Category</option>
            </select>

            <select
              value={filterCategory || ''}
              onChange={e => setFilterCategory(e.target.value || null)}
              className="px-4 pr-8 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              aria-label="Filter by category"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredItems.length > 0 ? (
          <div className="space-y-3">
            {filteredItems.map(item => (
              <FreezerItemCard
                key={item.id}
                item={item}
                onRemove={onRemoveItem}
                onEdit={handleEditItem}
              />
            ))}
          </div>
        ) : (
          <div className="px-0">
            <EmptyState
              title={searchTerm || filterCategory ? "No matching items" : "Your freezer is empty"}
              description={searchTerm || filterCategory 
                ? "Try changing your search or filters" 
                : "Add items using the input bar above"}
              icon={<RefrigeratorIcon size={32} />}
            />
          </div>
        )}
      </section>
      
      {currentEditItem && (
        <EditFreezerItemModal 
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

export default FreezerPage;
import React, { useState, useMemo, useCallback } from 'react';
import { Filter, Search, RefrigeratorIcon } from 'lucide-react';
import UniversalInputBar from '../components/UniversalInputBar';
import FreezerItemCard from '../components/FreezerItemCard';
import EmptyState from '../components/EmptyState';
import EditFreezerItemModal from '../components/EditFreezerItemModal';
import LoadingTransition from '../components/LoadingTransition';
import { FreezerItem } from '../types';
import { getCategories } from '../data/categories';
import { useStorage } from '../store/StorageContext';
import { v4 as uuidv4 } from 'uuid';
import { parseItemText } from '../utils/textParser';
import { recognizeImageContent, scanBarcode } from '../api/services/images';
import { toast } from 'react-hot-toast';
import { logger } from "@/lib/logger";

const FreezerPage: React.FC = () => {
  const { freezerItems } = useStorage();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'expiration' | 'category'>('expiration');
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentEditItem, setCurrentEditItem] = useState<FreezerItem | null>(null);

  // Get all predefined categories
  const predefinedCategories = getCategories();

  // Get all unique categories from items - memoize to prevent recalculation
  const usedCategories = useMemo(() => 
    [...new Set(freezerItems.items.map(item => item.category))], 
    [freezerItems.items]
  );
  
  // Combine and deduplicate categories - memoize result
  const categories = useMemo(() => 
    [...new Set([...predefinedCategories, ...usedCategories])], 
    [predefinedCategories, usedCategories]
  );

  // Handle edit item - wrapped in useCallback
  const handleEditItem = useCallback((item: FreezerItem) => {
    setCurrentEditItem(item);
    setIsEditModalOpen(true);
  }, []);

  // Handle save edited item - wrapped in useCallback
  const handleSaveEditedItem = useCallback(async (updatedItem: FreezerItem) => {
    try {
      await freezerItems.updateItem(updatedItem);
      toast.success(`Updated ${updatedItem.name}`);
    } catch (error) {
      logger.error('Error updating item:', error);
      toast.error('Failed to update item');
    } finally {
      setIsEditModalOpen(false);
      setCurrentEditItem(null);
    }
  }, [freezerItems]);

  // Add a new freezer item from text input - wrapped in useCallback
  const handleAddFreezerItem = useCallback(async (itemName: string) => {
    try {
      // Parse the text to extract item details
      const parsedDetails = await parseItemText(itemName, null);
      
      // Create a new item with the parsed details
      const newItem: FreezerItem = {
        id: uuidv4(),
        name: parsedDetails.name,
        addedDate: new Date(),
        expirationDate: parsedDetails.expirationDate,
        category: parsedDetails.category || 'Other', // Ensure category has a fallback
        quantity: parsedDetails.quantity || 1,     // Ensure quantity has a fallback
        size: parsedDetails.size || '',              // Ensure size has a fallback
        tags: parsedDetails.tags || [],              // Ensure tags has a fallback
        notes: '',
        source: 'text'
      };
      
      // Check if freezerItems.addItem is defined before calling it
      if (freezerItems && typeof freezerItems.addItem === 'function') {
        await freezerItems.addItem(newItem);
        toast.success(`Added ${newItem.name} to your freezer`);
      } else {
        logger.error('Error: freezerItems.addItem is not a function');
        toast.error('Failed to add item to freezer');
      }
    } catch (error) {
      logger.error('Error creating freezer item:', error);
      toast.error('Failed to process item. Please try again.');
    }
  }, [freezerItems]);

  // Process an uploaded image - wrapped in useCallback
  const handleImageUpload = useCallback(async (file: File) => {
    try {
      // Use the API to recognize the image content
      const recognizedText = await recognizeImageContent(file);
      
      // Create a temporary URL for the uploaded image
      const imageUrl = URL.createObjectURL(file);
      
      // Parse the recognized text and create a new item
      const parsedDetails = await parseItemText(recognizedText, null);
      const newItem: FreezerItem = {
        id: uuidv4(),
        name: parsedDetails.name,
        addedDate: new Date(),
        expirationDate: parsedDetails.expirationDate,
        category: parsedDetails.category || 'Other',
        quantity: parsedDetails.quantity || 1,
        size: parsedDetails.size || '',
        tags: parsedDetails.tags || [],
        notes: '',
        imageUrl: imageUrl,
        source: 'image'
      };
      
      if (freezerItems && typeof freezerItems.addItem === 'function') {
        await freezerItems.addItem(newItem);
        toast.success(`Added ${newItem.name} from image`);
      } else {
        logger.error('Error: freezerItems.addItem is not a function');
        toast.error('Failed to add item from image');
      }
    } catch (error) {
      logger.error('Error processing image:', error);
      toast.error('Failed to process image');
    }
  }, [freezerItems]);

  // Process a scanned barcode - wrapped in useCallback
  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    try {
      // Process the barcode
      const productName = await scanBarcode(barcode);
      
      // Parse the product name and create a new item
      const parsedDetails = await parseItemText(productName, null);
      const newItem: FreezerItem = {
        id: uuidv4(),
        name: parsedDetails.name,
        addedDate: new Date(),
        expirationDate: parsedDetails.expirationDate,
        category: parsedDetails.category || 'Other',
        quantity: parsedDetails.quantity || 1,
        size: parsedDetails.size || '',
        tags: parsedDetails.tags || [],
        notes: '',
        source: 'barcode'
      };
      
      if (freezerItems && typeof freezerItems.addItem === 'function') {
        await freezerItems.addItem(newItem);
        toast.success(`Added ${newItem.name} from barcode`);
      } else {
        logger.error('Error: freezerItems.addItem is not a function');
        toast.error('Failed to add item from barcode');
      }
    } catch (error) {
      logger.error('Error processing barcode:', error);
      toast.error('Failed to process barcode');
    }
  }, [freezerItems]);

  // Handle voice input - wrapped in useCallback
  const handleVoiceInput = useCallback(async (transcript: string) => {
    toast.success('Processing voice input...');
    await handleAddFreezerItem(transcript);
  }, [handleAddFreezerItem]);

  // Remove a freezer item - wrapped in useCallback
  const handleRemoveFreezerItem = useCallback(async (id: string) => {
    const itemToDelete = freezerItems.items.find(item => item.id === id);
    if (!itemToDelete) return;
    
    try {
      if (freezerItems && typeof freezerItems.deleteItem === 'function') {
        await freezerItems.deleteItem(id);
        toast.success(`Removed ${itemToDelete.name}`);
      } else {
        logger.error('Error: freezerItems.deleteItem is not a function');
        toast.error('Failed to remove item');
      }
    } catch (error) {
      logger.error('Error removing item:', error);
      toast.error('Failed to remove item');
    }
  }, [freezerItems]);

  // Filter and sort items - memoize to prevent recalculation on every render
  const filteredItems = useMemo(() => {
    return freezerItems.items
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
  }, [freezerItems.items, searchTerm, filterCategory, sortBy]);

  return (
    <div className="pb-16 md:pb-4"> {/* Padding to accommodate mobile nav */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">Freezer Inventory</h2>
        <div className="mb-6">
          <UniversalInputBar
            onSubmit={handleAddFreezerItem}
            onImageUpload={handleImageUpload}
            onBarcodeScanned={handleBarcodeScanned}
            onVoiceInput={handleVoiceInput}
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

        <LoadingTransition loading={freezerItems.loading}>
          {filteredItems.length > 0 ? (
            <div className="space-y-3">
              {filteredItems.map(item => (
                <FreezerItemCard
                  key={item.id}
                  item={item}
                  onRemove={handleRemoveFreezerItem}
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
        </LoadingTransition>
      </section>
      
      {currentEditItem && (
        <EditFreezerItemModal 
          item={currentEditItem}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveEditedItem}
          categories={categories}
          source={currentEditItem.source}
        />
      )}
    </div>
  );
};

export default FreezerPage;
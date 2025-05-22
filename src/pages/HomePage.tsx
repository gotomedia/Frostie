import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Clock, ShoppingCart, ChefHat, Lightbulb, Loader } from 'lucide-react';
import UniversalInputBar from '../components/UniversalInputBar';
import FreezerItemCard from '../components/FreezerItemCard';
import MealIdeaCard from '../components/MealIdeaCard';
import EmptyState from '../components/EmptyState';
import ShoppingItemComponent from '../components/ShoppingItem';
import FreezerTip from '../components/FreezerTip';
import LoadingTransition from '../components/LoadingTransition';
import SummaryCard from '../components/SummaryCard';
import { useStorage } from '../store/StorageContext';
import { v4 as uuidv4 } from 'uuid';
import { parseItemText } from '../utils/textParser';
import { recognizeImageContent, scanBarcode } from '../api/services/images';
import { toast } from 'react-hot-toast';

const HomePage: React.FC = () => {
  const { 
    freezerItems, 
    shoppingItems, 
    mealIdeas,
    isInitializing
  } = useStorage();
  
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Filter items expiring in the next 7 days - memoize to prevent recalculation
  const expiringItems = useMemo(() => 
    freezerItems.items.filter(item => {
      const today = new Date();
      const expirationDate = new Date(item.expirationDate);
      const diffTime = expirationDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7 && diffDays >= 0;
    }),
    [freezerItems.items]
  );
  
  // Get incomplete shopping items - memoize to prevent recalculation
  const incompleteShoppingItems = useMemo(() => 
    shoppingItems.items.filter(item => !item.completed).slice(0, 3),
    [shoppingItems.items]
  );
  
  // Generate meal ideas - wrapped in useCallback
  const handleGenerateIdeas = useCallback(async () => {
    if (isGenerating || freezerItems.items.length === 0) return;
    
    try {
      setIsGenerating(true);
      
      // This would be replaced with actual API call in your production code
      // For now, let's simulate adding some mock meal ideas
      const mockIdeas = [
        {
          id: uuidv4(),
          title: 'Chicken Stir Fry',
          description: 'Quick and easy stir fry with frozen vegetables and chicken.',
          ingredients: ['Chicken', 'Vegetables', 'Soy Sauce'],
          imageUrl: 'https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg',
          matchedItems: freezerItems.items
            .filter(item => 
              item.name.toLowerCase().includes('chicken') || 
              item.name.toLowerCase().includes('vegetable')
            ).map(item => item.name),
          vegetarian: false,
          vegan: false,
          glutenFree: true,
          dairyFree: true,
          cookingTime: '30 minutes'
        },
        {
          id: uuidv4(),
          title: 'Homemade Pizza',
          description: 'Use that frozen dough to make a delicious homemade pizza.',
          ingredients: ['Pizza Dough', 'Sauce', 'Cheese', 'Toppings'],
          imageUrl: 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg',
          matchedItems: freezerItems.items
            .filter(item => 
              item.name.toLowerCase().includes('pizza') || 
              item.name.toLowerCase().includes('dough')
            ).map(item => item.name),
          vegetarian: true,
          vegan: false,
          glutenFree: false,
          dairyFree: false,
          cookingTime: '45 minutes'
        },
        {
          id: uuidv4(),
          title: 'Berry Smoothie',
          description: 'A refreshing and nutritious breakfast using frozen berries.',
          ingredients: ['Frozen Mixed Berries', 'Banana', 'Yogurt', 'Honey', 'Granola'],
          imageUrl: 'https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg',
          matchedItems: freezerItems.items
            .filter(item => 
              item.name.toLowerCase().includes('berry') || 
              item.name.toLowerCase().includes('fruit')
            ).map(item => item.name),
          vegetarian: true,
          vegan: false,
          glutenFree: true,
          dairyFree: false,
          cookingTime: '10 minutes'
        }
      ];
      
      // Add the mock ideas
      for (const idea of mockIdeas) {
        await mealIdeas.addItem(idea);
      }
      
      toast.success(`Generated ${mockIdeas.length} meal ideas!`);
    } catch (error) {
      console.error('Error generating meal ideas:', error);
      toast.error('Failed to generate meal ideas');
    } finally {
      setIsGenerating(false);
    }
  }, [freezerItems.items, mealIdeas, isGenerating]);
  
  // Add a new freezer item - wrapped in useCallback
  const handleAddFreezerItem = useCallback(async (itemName: string) => {
    try {
      // Use the parser to create a new freezer item
      const parsedDetails = await parseItemText(itemName, null);
      const newItem = {
        id: uuidv4(),
        name: parsedDetails.name,
        addedDate: new Date(),
        expirationDate: parsedDetails.expirationDate,
        category: parsedDetails.category || 'Other',
        quantity: parsedDetails.quantity || 1,
        size: parsedDetails.size || '',
        tags: parsedDetails.tags || [],
        notes: '',
        source: 'text'
      };
      
      if (freezerItems && typeof freezerItems.addItem === 'function') {
        await freezerItems.addItem(newItem);
        toast.success(`Added ${newItem.name} to your freezer`);
      } else {
        console.error('Error: freezerItems.addItem is not a function');
        toast.error('Failed to add item to freezer');
      }
    } catch (error) {
      console.error('Error creating freezer item:', error);
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
      const newItem = {
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
        console.error('Error: freezerItems.addItem is not a function');
        toast.error('Failed to add item from image');
      }
    } catch (error) {
      console.error('Error processing image:', error);
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
      const newItem = {
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
        console.error('Error: freezerItems.addItem is not a function');
        toast.error('Failed to add item from barcode');
      }
    } catch (error) {
      console.error('Error processing barcode:', error);
      toast.error('Failed to process barcode');
    }
  }, [freezerItems]);
  
  // Handle voice input - wrapped in useCallback
  const handleVoiceInput = useCallback(async (transcript: string) => {
    toast.success('Processing voice input...');
    await handleAddFreezerItem(transcript);
  }, [handleAddFreezerItem]);
  
  // Check if any data is currently loading
  const isLoading = freezerItems.loading || shoppingItems.loading || mealIdeas.loading || isInitializing;

  return (
    <div className="pb-16 md:pb-4">
      <LoadingTransition loading={isLoading}>
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">Add to Freezer</h2>
          <UniversalInputBar
            onSubmit={handleAddFreezerItem}
            onImageUpload={handleImageUpload}
            onBarcodeScanned={handleBarcodeScanned}
            onVoiceInput={handleVoiceInput}
            placeholder="Add item to freezer..."
          />
          
          <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg mt-2 text-sm text-blue-700 dark:text-blue-300">
            <p>
              <span className="font-medium">Pro tips:</span> 
            </p>
            <ul className="list-disc pl-5 mt-1 space-y-1">
              <li>Add expiration dates: "Chicken expires: 10/15/2025" or "Beef good for 2 weeks"</li>
              <li>Specify quantity and size: "2 8oz salmon fillets"</li>
              <li>Add tags with #: "Homemade tomato sauce #italian #dinner"</li>
            </ul>
          </div>
        </section>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Link to="/freezer" className="block transition-transform hover:scale-[1.02]">
            <SummaryCard
              title="Total Items"
              value={freezerItems.items.length}
              description="Items in your freezer"
              icon={<AlertCircle size={20} />}
              color="blue"
            />
          </Link>
          <Link to="/freezer" className="block transition-transform hover:scale-[1.02]">
            <SummaryCard
              title="Expiring Soon"
              value={expiringItems.length}
              description="Items expiring in 7 days"
              icon={<Clock size={20} />}
              color={expiringItems.length > 0 ? "red" : "green"}
            />
          </Link>
          <Link to="/shopping" className="block transition-transform hover:scale-[1.02]">
            <SummaryCard
              title="Shopping List"
              value={shoppingItems.items.length}
              description="Items to buy"
              icon={<ShoppingCart size={20} />}
              color="yellow"
            />
          </Link>
        </div>
        
        <section className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Expiring Soon</h2>
            <Link to="/freezer" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              View all
            </Link>
          </div>
          
          {expiringItems.length > 0 ? (
            <div className="space-y-3">
              {expiringItems.slice(0, 3).map(item => (
                <FreezerItemCard
                  key={item.id}
                  item={item}
                  onRemove={() => {}} // No remove functionality on the home page preview
                  onEdit={() => {}} // No edit functionality on the home page preview
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="No items expiring soon"
              description="Items that are expiring within 7 days will appear here."
              icon={<Clock size={32} />}
            />
          )}
        </section>
        
        <section className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Shopping List</h2>
            <Link to="/shopping" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              View all
            </Link>
          </div>
          
          {incompleteShoppingItems.length > 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700">
              {incompleteShoppingItems.map(item => (
                <ShoppingItemComponent
                  key={item.id}
                  item={item}
                  onToggle={() => {}} // No toggle functionality on the home page preview
                  onRemove={() => {}} // No remove functionality on the home page preview
                  onEdit={() => {}} // No edit functionality on the home page preview
                />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Your shopping list is empty"
              description="Add items to your shopping list."
              icon={<ShoppingCart size={32} />}
            />
          )}
        </section>
        
        <section className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Meal Ideas</h2>
            <button 
              onClick={handleGenerateIdeas} 
              className="text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-1.5"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader size={14} className="animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Ideas'
              )}
            </button>
          </div>
          
          {isGenerating ? (
            <div className="flex justify-center items-center py-10">
              <div className="text-center">
                <Loader size={40} className="animate-spin mx-auto mb-4 text-blue-500" />
                <p className="text-slate-600 dark:text-slate-300">Generating meal ideas based on your freezer items...</p>
              </div>
            </div>
          ) : mealIdeas.items.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mealIdeas.items.slice(0, 2).map(idea => (
                <MealIdeaCard key={idea.id} idea={idea} />
              ))}
              <Link to="/ideas" className="flex items-center justify-center p-4 text-blue-600 dark:text-blue-400 hover:underline">
                View all ideas
              </Link>
            </div>
          ) : (
            <EmptyState
              title="No meal ideas yet"
              description="Click 'Generate Ideas' to get meal suggestions based on your freezer inventory."
              icon={<ChefHat size={32} />}
            />
          )}
        </section>
        
        <section className="mb-4">
          <div className="flex items-center mb-3">
            <Lightbulb className="text-green-500 mr-2" size={20} />
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Freezer Tip</h2>
          </div>
          
          <FreezerTip />
        </section>
      </LoadingTransition>
    </div>
  );
};

export default HomePage;
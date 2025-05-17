import React, { useState } from 'react';
import { AlertCircle, Clock, ShoppingCart, ChefHat, Lightbulb, Loader } from 'lucide-react';
import UniversalInputBar from '../components/UniversalInputBar';
import SummaryCard from '../components/SummaryCard';
import FreezerItemCard from '../components/FreezerItemCard';
import MealIdeaCard from '../components/MealIdeaCard';
import EmptyState from '../components/EmptyState';
import ShoppingItemComponent from '../components/ShoppingItem';
import { FreezerItem, ShoppingItem, MealIdea } from '../types';
import FreezerTip from '../components/FreezerTip';

interface HomePageProps {
  freezerItems: FreezerItem[];
  expiringItems: FreezerItem[];
  shoppingItems: ShoppingItem[];
  mealIdeas: MealIdea[];
  onAddItem: (value: string) => Promise<void> | void;
  onImageUpload: (file: File) => Promise<void> | void;
  onBarcodeScanned: (barcode: string) => void;
  onVoiceInput: (transcript: string) => void;
  generateMealIdeas: () => Promise<void>;
}

const HomePage: React.FC<HomePageProps> = ({
  freezerItems,
  expiringItems,
  shoppingItems,
  mealIdeas,
  onAddItem,
  onImageUpload,
  onBarcodeScanned,
  onVoiceInput,
  generateMealIdeas
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const handleGenerateIdeas = async () => {
    if (isGenerating) return;
    
    try {
      setIsGenerating(true);
      await generateMealIdeas();
    } catch (error) {
      console.error('Error generating meal ideas:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="pb-16 md:pb-4"> {/* Padding to accommodate mobile nav */}
      <section className="mb-6">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-3">Add to Freezer</h2>
        <UniversalInputBar
          onSubmit={onAddItem}
          onImageUpload={onImageUpload}
          onBarcodeScanned={onBarcodeScanned}
          onVoiceInput={onVoiceInput}
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
        <SummaryCard
          title="Total Items"
          value={freezerItems.length}
          description="Items in your freezer"
          icon={<AlertCircle size={20} />}
          color="blue"
        />
        <SummaryCard
          title="Expiring Soon"
          value={expiringItems.length}
          description="Items expiring in 7 days"
          icon={<Clock size={20} />}
          color={expiringItems.length > 0 ? "red" : "green"}
        />
        <SummaryCard
          title="Shopping List"
          value={shoppingItems.length}
          description="Items to buy"
          icon={<ShoppingCart size={20} />}
          color="yellow"
        />
      </div>
      
      <section className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Expiring Soon</h2>
          <a href="#" className="text-sm text-blue-600 dark:text-blue-400 hover:underline" onClick={(e) => {
            // This would navigate to the freezer page in a more complex app
            e.preventDefault();
            window.location.href = '/freezer';
          }}>View all</a>
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
          <a href="#" className="text-sm text-blue-600 dark:text-blue-400 hover:underline" onClick={(e) => {
            // This would navigate to the shopping page in a more complex app
            e.preventDefault();
            window.location.href = '/shopping';
          }}>View all</a>
        </div>
        
        {shoppingItems.length > 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-700">
            {shoppingItems.map(item => (
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
        ) : mealIdeas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mealIdeas.slice(0, 2).map(idea => (
              <MealIdeaCard key={idea.id} idea={idea} />
            ))}
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
    </div>
  );
};

export default HomePage;
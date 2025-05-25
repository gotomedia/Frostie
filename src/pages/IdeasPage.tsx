import React, { useState, useEffect, useMemo, useCallback, useContext } from 'react';
import { ChefHat, Sparkle, Filter, Loader, Heart, Trash2 } from 'lucide-react';
import MealIdeaCard from '../components/MealIdeaCard';
import EmptyState from '../components/EmptyState';
import LoadingTransition from '../components/LoadingTransition';
import { MealIdea } from '../types';
import { useStorage } from '../store/StorageContext';
import { generateMealIdeas } from '../api/services/mealIdeas';
import { AuthContext } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext'; // Import useSettings
import { toast } from 'react-hot-toast';
import { logger } from "@/lib/logger";

const IdeasPage: React.FC = () => {
  const { mealIdeas, freezerItems } = useStorage();
  const { user } = useContext(AuthContext);
  const { settings } = useSettings(); // Get settings to access dietary preferences
  
  const [vegetarian, setVegetarian] = useState(false);
  const [vegan, setVegan] = useState(false);
  const [glutenFree, setGlutenFree] = useState(false);
  const [dairyFree, setDairyFree] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // State for favorite ideas and displayed ideas
  const [favoriteIdeas, setFavoriteIdeas] = useState<MealIdea[]>([]);
  const [displayedIdeas, setDisplayedIdeas] = useState<MealIdea[]>([]);
  
  // Process meal ideas to add matchedItems based on freezer inventory
  const processIdeasWithMatchedItems = useCallback((ideas: MealIdea[]) => {
    logger.debug('Processing meal ideas to add matched items');
    return ideas.map(idea => {
      // For each idea, check which freezer items match the ingredients
      const matchedItems = freezerItems.items.filter(item => {
        // Check if any ingredient contains this freezer item name (case insensitive)
        const itemName = item.name.toLowerCase();
        return idea.ingredients.some(ingredient => 
          ingredient.toLowerCase().includes(itemName) || 
          itemName.includes(ingredient.toLowerCase())
        );
      }).map(item => item.name);
      
      logger.debug(`Idea "${idea.title}" matched with: ${matchedItems.join(', ') || 'none'}`);
      
      // Return the idea with the matched items
      return {
        ...idea,
        matchedItems
      };
    });
  }, [freezerItems.items]);
  
  // Initialize displayed ideas when meal ideas load and when freezer items change
  useEffect(() => {
    if (!mealIdeas.loading) {
      logger.debug('Updating displayed ideas with matched items');
      const processedIdeas = processIdeasWithMatchedItems(mealIdeas.items);
      
      setDisplayedIdeas(processedIdeas.map(idea => ({
        ...idea,
        favorite: favoriteIdeas.some(fav => fav.id === idea.id)
      })));
    }
  }, [mealIdeas.items, mealIdeas.loading, favoriteIdeas, processIdeasWithMatchedItems]);
  
  // Apply dietary filters to displayed ideas - memoize to prevent recalculation
  const filteredMealIdeas = useMemo(() =>
    displayedIdeas.filter(idea => {
      if (vegetarian && idea.vegetarian === false) return false;
      if (vegan && idea.vegan === false) return false;
      if (glutenFree && idea.glutenFree === false) return false;
      if (dairyFree && idea.dairyFree === false) return false;
      return true;
    }),
    [displayedIdeas, vegetarian, vegan, glutenFree, dairyFree]
  );

  // Calculate active filter count - memoize to prevent recalculation
  const activeFilterCount = useMemo(() => 
    [vegetarian, vegan, glutenFree, dairyFree].filter(Boolean).length,
    [vegetarian, vegan, glutenFree, dairyFree]
  );

  // Toggle favorite status for a meal idea - wrapped in useCallback
  const toggleFavorite = useCallback(async (id: string) => {
    // Find the idea in displayed ideas
    const idea = displayedIdeas.find(idea => idea.id === id);
    if (!idea) return;
    
    // Check if it's already a favorite
    const isFavorite = favoriteIdeas.some(fav => fav.id === id);
    
    if (isFavorite) {
      // Remove from favorites
      setFavoriteIdeas(prev => prev.filter(fav => fav.id !== id));
      // Update the displayed idea's favorite status
      setDisplayedIdeas(prev => 
        prev.map(item => item.id === id ? {...item, favorite: false} : item)
      );
      
      try {
        // If the idea exists in storage, update it
        const updatedIdea = { ...idea, favorite: false };
        await mealIdeas.updateItem(updatedIdea);
      } catch (error) {
        logger.error('Error updating meal idea:', error);
      }
    } else {
      // Add to favorites
      const updatedIdea = {...idea, favorite: true};
      setFavoriteIdeas(prev => [...prev, updatedIdea]);
      // Update the displayed idea's favorite status
      setDisplayedIdeas(prev => 
        prev.map(item => item.id === id ? {...item, favorite: true} : item)
      );
      
      try {
        // If the idea exists in storage, update it
        await mealIdeas.updateItem(updatedIdea);
      } catch (error) {
        logger.error('Error updating meal idea:', error);
      }
    }
  }, [displayedIdeas, favoriteIdeas, mealIdeas]);

  // Handle removing a meal idea - wrapped in useCallback
  const handleRemoveIdea = useCallback(async (id: string) => {
    try {
      // Find the idea to be removed
      const ideaToRemove = displayedIdeas.find(idea => idea.id === id);
      if (!ideaToRemove) return;
      
      // Optimistically update UI by removing from displayed ideas
      setDisplayedIdeas(prev => prev.filter(idea => idea.id !== id));
      
      // If it was a favorite, remove from favorites too
      if (ideaToRemove.favorite) {
        setFavoriteIdeas(prev => prev.filter(fav => fav.id !== id));
      }
      
      // Delete from storage
      await mealIdeas.deleteItem(id);
      toast.success(`Removed "${ideaToRemove.title}"`);
    } catch (error) {
      logger.error('Error removing meal idea:', error);
      toast.error('Failed to remove meal idea');
      
      // Refresh ideas from storage if there was an error
      const refreshedIdeas = await mealIdeas.getItems();
      setDisplayedIdeas(refreshedIdeas.map(idea => ({
        ...idea,
        favorite: favoriteIdeas.some(fav => fav.id === idea.id)
      })));
    }
  }, [displayedIdeas, favoriteIdeas, mealIdeas]);

  // Generate meal ideas - wrapped in useCallback
  const handleGenerateIdeas = useCallback(async () => {
    if (isGenerating || freezerItems.items.length === 0) return;
    
    try {
      setIsGenerating(true);

      // Log before generating to debug
      logger.debug('🍽️ Generating meal ideas for IdeasPage');
      logger.debug('📋 Number of freezer items used to generate ideas:', freezerItems.items.length);
      logger.debug('🥬 Freezer item names:', freezerItems.items.map(item => item.name));
      
      // Get dietary preferences from settings context (or local state if specified)
      const dietaryPreferences = {
        vegetarian: settings?.dietary?.vegetarian || vegetarian,
        vegan: settings?.dietary?.vegan || vegan,
        glutenFree: settings?.dietary?.glutenFree || glutenFree,
        dairyFree: settings?.dietary?.dairyFree || dairyFree
      };
      
      logger.debug('🥗 Using dietary preferences for generation:', dietaryPreferences);
      
      // Call the API service to generate meal ideas with dietary preferences
      const generatedIdeas = await generateMealIdeas(freezerItems.items, dietaryPreferences);
      logger.debug('🍲 Generated meal ideas:', generatedIdeas.length);
      
      if (generatedIdeas && generatedIdeas.length > 0) {
        logger.debug('💡 Generated meal ideas with matches:');
        generatedIdeas.forEach(idea => {
          logger.debug(`  - ${idea.title}: matched with ${idea.matchedItems?.length || 0} items`);
        });
        
        // Add the generated ideas to the storage
        for (const idea of generatedIdeas) {
          logger.debug('Adding meal idea:', idea.title);
          logger.debug('Meal idea ID:', idea.id);
          logger.debug('Meal idea ingredients:', idea.ingredients);
          
          try {
            await mealIdeas.addItem(idea);
          } catch (error) {
            logger.error(`Error adding meal idea ${idea.title}:`, error);
          }
        }
        
        toast.success(`Generated ${generatedIdeas.length} meal ideas!`);
      } else {
        logger.debug('No meal ideas were generated');
        toast.error('Could not generate meal ideas. Please try again.');
      }
    } catch (error) {
      logger.error('Error generating meal ideas:', error);
      toast.error('Failed to generate meal ideas');
    } finally {
      setIsGenerating(false);
    }
  }, [freezerItems.items, mealIdeas, isGenerating, settings, vegetarian, vegan, glutenFree, dairyFree]);

  return (
    <div className="pb-16 md:pb-4"> {/* Padding to accommodate mobile nav */}
      <LoadingTransition loading={mealIdeas.loading || freezerItems.loading}>
        <section className="mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 gap-3">
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Meal Ideas</h2>
            
            <div className="flex gap-2">
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors ${
                  showFilters || activeFilterCount > 0
                    ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800'
                    : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                }`}
                aria-expanded={showFilters}
                aria-controls="dietary-filters"
              >
                <Filter size={18} />
                <span>Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
              </button>
              
              <button 
                onClick={handleGenerateIdeas}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={freezerItems.items.length === 0 || isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkle size={18} />
                    Generate Ideas
                  </>
                )}
              </button>
            </div>
          </div>
          
          {showFilters && (
            <div 
              id="dietary-filters" 
              className="bg-white dark:bg-slate-800 p-4 mb-6 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm"
            >
              <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Dietary Preferences</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 h-4 w-4 dark:bg-slate-700"
                    checked={vegetarian}
                    onChange={() => setVegetarian(!vegetarian)}
                  />
                  <span className="text-slate-700 dark:text-slate-300">Vegetarian</span>
                </label>
                
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 h-4 w-4 dark:bg-slate-700"
                    checked={vegan}
                    onChange={() => setVegan(!vegan)}
                  />
                  <span className="text-slate-700 dark:text-slate-300">Vegan</span>
                </label>
                
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 h-4 w-4 dark:bg-slate-700"
                    checked={glutenFree}
                    onChange={() => setGlutenFree(!glutenFree)}
                  />
                  <span className="text-slate-700 dark:text-slate-300">Gluten-Free</span>
                </label>
                
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 h-4 w-4 dark:bg-slate-700"
                    checked={dairyFree}
                    onChange={() => setDairyFree(!dairyFree)}
                  />
                  <span className="text-slate-700 dark:text-slate-300">Dairy-Free</span>
                </label>
              </div>
              
              {activeFilterCount > 0 && (
                <button 
                  onClick={() => {
                    setVegetarian(false);
                    setVegan(false);
                    setGlutenFree(false);
                    setDairyFree(false);
                  }}
                  className="text-sm text-blue-600 dark:text-blue-400 mt-3 hover:underline"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}

          {favoriteIdeas.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Heart size={18} className="text-red-500" />
                <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300">Favorited Meals ({favoriteIdeas.length})</h3>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                Your favorite meals are locked and will remain when generating new ideas.
              </p>
            </div>
          )}
          
          {freezerItems.items.length === 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 dark:border-yellow-600 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <ChefHat className="h-5 w-5 text-yellow-400 dark:text-yellow-300" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Add some items to your freezer first to get meal suggestions.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {activeFilterCount > 0 && filteredMealIdeas.length === 0 && displayedIdeas.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-400 dark:border-blue-600 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Filter className="h-5 w-5 text-blue-400 dark:text-blue-300" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    No meal ideas match your dietary preferences. Try adjusting your filters or generating new ideas.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {isGenerating ? (
            <div className="flex justify-center items-center py-10">
              <div className="text-center">
                <Loader size={40} className="animate-spin mx-auto mb-4 text-blue-500" />
                <p className="text-slate-600 dark:text-slate-300">Generating meal ideas based on your freezer items...</p>
              </div>
            </div>
          ) : (
            filteredMealIdeas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMealIdeas.map(idea => (
                  <MealIdeaCard 
                    key={idea.id} 
                    idea={idea} 
                    onToggleFavorite={toggleFavorite}
                    onRemove={handleRemoveIdea}
                  />
                ))}
              </div>
            ) : !isGenerating && (
              <EmptyState
                title="No meal ideas yet"
                description="Click 'Generate Ideas' to get suggestions based on your freezer inventory."
                icon={<ChefHat size={32} />}
              />
            )
          )}
        </section>
      </LoadingTransition>
    </div>
  );
};

export default IdeasPage;
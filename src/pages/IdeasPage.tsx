import React, { useState, useEffect } from 'react';
import { ChefHat, Sparkle, Filter, Loader, Heart } from 'lucide-react';
import MealIdeaCard from '../components/MealIdeaCard';
import EmptyState from '../components/EmptyState';
import { MealIdea, FreezerItem } from '../types';

interface IdeasPageProps {
  mealIdeas: MealIdea[];
  freezerItems: FreezerItem[];
  generateMealIdeas: () => Promise<void>;
}

const IdeasPage: React.FC<IdeasPageProps> = ({
  mealIdeas,
  freezerItems,
  generateMealIdeas
}) => {
  const [vegetarian, setVegetarian] = useState(false);
  const [vegan, setVegan] = useState(false);
  const [glutenFree, setGlutenFree] = useState(false);
  const [dairyFree, setDairyFree] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // State for favorite ideas and displayed ideas
  const [favoriteIdeas, setFavoriteIdeas] = useState<MealIdea[]>([]);
  const [displayedIdeas, setDisplayedIdeas] = useState<MealIdea[]>(mealIdeas);
  
  // When mealIdeas changes from outside, update displayed ideas
  useEffect(() => {
    // Merge favorites with new ideas, ensuring favorites are preserved
    const updatedIdeas = [...favoriteIdeas];
    
    // Add non-duplicate, non-favorite ideas up to 9 total
    const remainingSlots = 9 - updatedIdeas.length;
    
    if (remainingSlots > 0) {
      // Get new ideas that aren't already favorites
      const newIdeas = mealIdeas.filter(idea => 
        !favoriteIdeas.some(fav => fav.id === idea.id)
      );
      
      // Add them up to the limit
      updatedIdeas.push(...newIdeas.slice(0, remainingSlots));
    }
    
    // Update the displayed ideas
    setDisplayedIdeas(updatedIdeas);
  }, [mealIdeas, favoriteIdeas]);
  
  // Apply dietary filters to displayed ideas
  const filteredMealIdeas = displayedIdeas.filter(idea => {
    if (vegetarian && idea.vegetarian === false) return false;
    if (vegan && idea.vegan === false) return false;
    if (glutenFree && idea.glutenFree === false) return false;
    if (dairyFree && idea.dairyFree === false) return false;
    return true;
  });

  const activeFilterCount = [vegetarian, vegan, glutenFree, dairyFree].filter(Boolean).length;

  // Toggle favorite status for a meal idea
  const toggleFavorite = (id: string) => {
    // Find the idea in displayed ideas
    const idea = displayedIdeas.find(idea => idea.id === id);
    if (!idea) return;
    
    // Toggle favorite status
    const isFavorite = favoriteIdeas.some(fav => fav.id === id);
    
    if (isFavorite) {
      // Remove from favorites
      setFavoriteIdeas(prev => prev.filter(fav => fav.id === id ? false : true));
      // Update the displayed idea's favorite status
      setDisplayedIdeas(prev => 
        prev.map(item => item.id === id ? {...item, favorite: false} : item)
      );
    } else {
      // Add to favorites
      const updatedIdea = {...idea, favorite: true};
      setFavoriteIdeas(prev => [...prev, updatedIdea]);
      // Update the displayed idea's favorite status
      setDisplayedIdeas(prev => 
        prev.map(item => item.id === id ? {...item, favorite: true} : item)
      );
    }
  };

  // Generate new meal ideas while preserving favorites
  const handleGenerateIdeas = async () => {
    if (isGenerating || freezerItems.length === 0) return;
    
    try {
      setIsGenerating(true);
      
      // Calculate how many new ideas we need
      const neededIdeas = 9 - favoriteIdeas.length;
      
      if (neededIdeas > 0) {
        // Generate new ideas
        await generateMealIdeas();
      } else {
        // We already have 9 favorite ideas, so just keep them
        setDisplayedIdeas(favoriteIdeas);
      }
    } catch (error) {
      console.error('Error generating meal ideas:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="pb-16 md:pb-4"> {/* Padding to accommodate mobile nav */}
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
              disabled={freezerItems.length === 0 || isGenerating}
            >
              {isGenerating ? (
                <Loader size={18} className="animate-spin" />
              ) : (
                <Sparkle size={18} />
              )}
              {isGenerating ? 'Generating...' : 'Generate Ideas'}
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
        
        {freezerItems.length === 0 && (
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
        
        {isGenerating && (
          <div className="flex justify-center items-center py-10">
            <div className="text-center">
              <Loader size={40} className="animate-spin mx-auto mb-4 text-blue-500" />
              <p className="text-slate-600 dark:text-slate-300">Generating meal ideas based on your freezer items...</p>
            </div>
          </div>
        )}
        
        {!isGenerating && filteredMealIdeas.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMealIdeas.map(idea => (
              <MealIdeaCard 
                key={idea.id} 
                idea={{...idea, favorite: favoriteIdeas.some(fav => fav.id === idea.id)}} 
                onToggleFavorite={toggleFavorite}
              />
            ))}
          </div>
        ) : !isGenerating && (
          <EmptyState
            title="No meal ideas yet"
            description="Click 'Generate Ideas' to get suggestions based on your freezer inventory."
            icon={<ChefHat size={32} />}
          />
        )}
      </section>
    </div>
  );
};

export default IdeasPage;
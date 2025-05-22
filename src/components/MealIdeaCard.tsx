import React, { memo } from 'react';
import { MealIdea } from '../types';
import { Leaf, Wheat, Milk, Heart, Clock, Trash2 } from 'lucide-react';

interface MealIdeaCardProps {
  idea: MealIdea;
  onToggleFavorite?: (id: string) => void;
  onRemove?: (id: string) => void; // New prop for delete functionality
}

const MealIdeaCard: React.FC<MealIdeaCardProps> = ({ idea, onToggleFavorite, onRemove }) => {
  // Generate dietary tags based on meal properties
  const dietaryTags = [];
  
  if (idea.vegetarian) {
    dietaryTags.push({ label: 'Vegetarian', icon: <Leaf size={12} /> });
  }
  
  if (idea.vegan) {
    dietaryTags.push({ label: 'Vegan', icon: <Leaf size={12} /> });
  }
  
  if (idea.glutenFree) {
    dietaryTags.push({ label: 'Gluten-Free', icon: <Wheat size={12} /> });
  }
  
  if (idea.dairyFree) {
    dietaryTags.push({ label: 'Dairy-Free', icon: <Milk size={12} /> });
  }

  // Handle the favorite button click
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onToggleFavorite) {
      onToggleFavorite(idea.id);
    }
  };
  
  // Handle the delete button click
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onRemove) {
      onRemove(idea.id);
    }
  };

  const cardId = `meal-idea-${idea.id}`;

  return (
    <div 
      className="bg-white dark:bg-slate-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 relative"
      role="article"
      aria-labelledby={`${cardId}-title`}
      aria-describedby={`${cardId}-description`}
    >
      {/* Top left: Favorite button */}
      {onToggleFavorite && (
        <button 
          onClick={handleFavoriteClick}
          className={`absolute top-2 left-2 p-2 rounded-full z-10 transition-colors ${
            idea.favorite 
              ? 'bg-red-100 text-red-500 dark:bg-red-900/30 dark:text-red-400' 
              : 'bg-slate-100/80 text-slate-400 dark:bg-slate-800/80 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400'
          }`}
          aria-label={idea.favorite ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={idea.favorite}
        >
          <Heart 
            size={18} 
            fill={idea.favorite ? "currentColor" : "none"} 
            aria-hidden="true" 
          />
        </button>
      )}
      
      {/* Top right: Delete button */}
      {onRemove && (
        <button
          onClick={handleDeleteClick}
          className="absolute top-2 right-2 p-2 rounded-full z-10 transition-colors bg-slate-100/80 text-slate-400 dark:bg-slate-800/80 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400"
          aria-label="Delete meal idea"
        >
          <Trash2 size={18} aria-hidden="true" />
        </button>
      )}

      <div className="h-48 overflow-hidden">
        <img 
          src={idea.imageUrl} 
          alt="" // Decorative image, non-essential content
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            // If image fails to load, replace with default
            (e.target as HTMLImageElement).src = 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg';
          }}
        />
      </div>
      <div className="p-4">
        <h3 
          id={`${cardId}-title`} 
          className="font-medium text-lg text-slate-800 dark:text-slate-100"
        >
          {idea.title}
        </h3>
        <p 
          id={`${cardId}-description`} 
          className="text-slate-600 dark:text-slate-300 text-sm mt-1"
        >
          {idea.description}
        </p>
        
        {/* Cooking time */}
        <div className="flex items-center mt-2 text-sm text-slate-500 dark:text-slate-400">
          <Clock size={14} className="mr-1" aria-hidden="true" />
          <span>{idea.cookingTime || 'N/A'}</span>
        </div>
        
        {/* Dietary tags */}
        {dietaryTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            <span className="sr-only">Dietary preferences:</span>
            {dietaryTags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs"
              >
                <span aria-hidden="true">{tag.icon}</span>
                {tag.label}
              </span>
            ))}
          </div>
        )}
        
        {idea.matchedItems && idea.matchedItems.length > 0 && (
          <div className="mt-3">
            <h4 className="text-xs font-medium uppercase text-slate-500 dark:text-slate-300">From your freezer</h4>
            <div className="flex flex-wrap gap-1 mt-1">
              {idea.matchedItems.map((item, index) => (
                <span 
                  key={index} 
                  className="bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 px-2 py-0.5 rounded-full text-xs"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(MealIdeaCard);
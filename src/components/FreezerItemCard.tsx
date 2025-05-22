import React, { memo } from 'react';
import { Calendar, Trash2, Edit2, Tag, Image } from 'lucide-react';
import { FreezerItem } from '../types';

interface FreezerItemCardProps {
  item: FreezerItem;
  onRemove: (id: string) => void;
  onEdit: (item: FreezerItem) => void;
}

const FreezerItemCard: React.FC<FreezerItemCardProps> = ({ item, onRemove, onEdit }) => {
  // Calculate days until expiration
  const getDaysUntilExpiration = (): number => {
    const today = new Date();
    const expirationDate = new Date(item.expirationDate);
    const diffTime = expirationDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  
  const daysLeft = getDaysUntilExpiration();
  
  // Determine expiration status for styling
  const getExpirationStatus = (): string => {
    if (daysLeft <= 0) return 'text-red-500 dark:text-red-400';
    if (daysLeft <= 3) return 'text-orange-500 dark:text-orange-400';
    if (daysLeft <= 7) return 'text-yellow-500 dark:text-yellow-400';
    return 'text-green-500 dark:text-green-400';
  };

  const expirationText = daysLeft <= 0 ? 'Expired' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} until expiration`;

  return (
    <div 
      className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm border-l-4 border-blue-500 flex justify-between items-start hover:shadow-md transition-shadow duration-200"
      aria-label={`${item.name}, ${item.size ? item.size + ',' : ''} ${item.category}, ${expirationText}`}
    >
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-slate-800 dark:text-slate-100">{item.name}</h3>
          {item.size && (
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {item.size}
            </span>
          )}
        </div>
        
        <div className="flex items-center mt-1 text-sm">
          <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full text-xs">
            {item.category}
          </span>
          {item.quantity > 1 && (
            <>
              <span className="mx-2 text-slate-400 dark:text-slate-500">•</span>
              <span className="text-slate-600 dark:text-slate-300 text-xs">
                Qty: {item.quantity}
              </span>
            </>
          )}
          <span className="mx-2 text-slate-400 dark:text-slate-500">•</span>
          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-300">
            <Calendar size={14} aria-hidden="true" />
            Added {new Date(item.addedDate).toLocaleDateString()}
          </span>
        </div>
        
        {item.tags && item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5" aria-label="Tags">
            {item.tags.map((tag, index) => (
              <span 
                key={index} 
                className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs"
              >
                <Tag size={10} aria-hidden="true" />
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {/* Display image thumbnail if available */}
        {item.imageUrl && (
          <div className="mt-2 flex items-center gap-2">
            <div className="w-10 h-10 rounded overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0">
              <img 
                src={item.imageUrl} 
                alt="" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Hide broken images
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Image size={12} />
              Image attached
            </span>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-3">
        <div className={`flex items-center gap-1 ${getExpirationStatus()}`} aria-live="polite">
          <span className="text-sm font-medium">
            {daysLeft <= 0 
              ? 'Expired' 
              : `${daysLeft} day${daysLeft === 1 ? '' : 's'}`}
          </span>
        </div>
        
        <button 
          onClick={() => onEdit(item)}
          className="text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 rounded-full p-1"
          aria-label={`Edit ${item.name}`}
        >
          <Edit2 size={18} aria-hidden="true" />
        </button>
        
        <button 
          onClick={() => onRemove(item.id)}
          className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 rounded-full p-1"
          aria-label={`Remove ${item.name}`}
        >
          <Trash2 size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(FreezerItemCard);
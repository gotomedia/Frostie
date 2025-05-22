import React, { memo } from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import { ShoppingItem as ShoppingItemType } from '../types';

interface ShoppingItemProps {
  item: ShoppingItemType;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (item: ShoppingItemType) => void;
}

const ShoppingItem: React.FC<ShoppingItemProps> = ({ 
  item, 
  onToggle, 
  onRemove,
  onEdit
}) => {
  const itemId = `shopping-item-${item.id}`;
  
  return (
    <div 
      className={`flex items-center p-3 border-b border-slate-100 dark:border-slate-700 
        ${item.completed ? 'bg-slate-50 dark:bg-slate-800/60' : 'bg-white dark:bg-slate-800'}`}
      role="listitem"
      aria-labelledby={`${itemId}-label`}
    >
      <input
        type="checkbox"
        id={`${itemId}-checkbox`}
        checked={item.completed}
        onChange={() => onToggle(item.id)}
        className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus-visible:ring-blue-500 dark:bg-slate-700"
        aria-labelledby={`${itemId}-label`}
      />
      
      <div className="ml-3 flex-1">
        <p 
          id={`${itemId}-label`}
          className={`${item.completed ? 'line-through text-slate-500 dark:text-slate-300' : 'text-slate-800 dark:text-slate-200'}`}
        >
          {item.name}
        </p>
        {item.category && (
          <span className="text-xs text-slate-500 dark:text-slate-300" id={`${itemId}-category`}>{item.category}</span>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => onEdit(item)}
          className="text-slate-400 dark:text-slate-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800 rounded-full p-1"
          aria-label={`Edit ${item.name}`}
        >
          <Edit2 size={18} aria-hidden="true" />
        </button>
        <button
          onClick={() => onRemove(item.id)}
          className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-800 rounded-full p-1"
          aria-label={`Remove ${item.name}`}
        >
          <Trash2 size={18} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export default memo(ShoppingItem);
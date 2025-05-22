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
  return (
    <div 
      className={`flex items-center p-3 border-b border-slate-100 dark:border-slate-700 
        ${item.completed ? 'bg-slate-50 dark:bg-slate-800/60' : 'bg-white dark:bg-slate-800'}`}
      aria-label={`Shopping item: ${item.name}, ${item.category}, ${item.completed ? 'completed' : 'not completed'}`}
    >
      <input
        type="checkbox"
        checked={item.completed}
        onChange={() => onToggle(item.id)}
        className="h-5 w-5 rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500 dark:bg-slate-700"
        aria-label={`Mark ${item.name} as ${item.completed ? 'incomplete' : 'complete'}`}
      />
      
      <div className="ml-3 flex-1">
        <p className={`${item.completed ? 'line-through text-slate-500 dark:text-slate-300' : 'text-slate-800 dark:text-slate-200'}`}>
          {item.name}
        </p>
        {item.category && (
          <span className="text-xs text-slate-500 dark:text-slate-300">{item.category}</span>
        )}
      </div>
      
      <div className="flex items-center gap-2">
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
export default memo(ShoppingItem);
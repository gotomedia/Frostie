import React from 'react';

interface SummaryCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'yellow';
}

const SummaryCard: React.FC<SummaryCardProps> = ({ 
  title, 
  value, 
  description, 
  icon, 
  color = 'blue' 
}) => {
  const getBgColor = () => {
    switch(color) {
      case 'green': return 'bg-green-100 dark:bg-green-900/30';
      case 'red': return 'bg-red-100 dark:bg-red-900/30';
      case 'yellow': return 'bg-yellow-100 dark:bg-yellow-900/30';
      default: return 'bg-blue-100 dark:bg-blue-900/30';
    }
  };
  
  const getTextColor = () => {
    switch(color) {
      case 'green': return 'text-green-600 dark:text-green-400';
      case 'red': return 'text-red-600 dark:text-red-400';
      case 'yellow': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-blue-600 dark:text-blue-400';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-sm font-medium text-slate-500 dark:text-slate-300">{title}</h3>
          <p className="text-2xl font-semibold mt-1 text-slate-800 dark:text-slate-100">{value}</p>
          {description && (
            <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">{description}</p>
          )}
        </div>
        
        <div className={`p-2 rounded-full ${getBgColor()} ${getTextColor()}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default SummaryCard;
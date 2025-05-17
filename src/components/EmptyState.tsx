import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ title, description, icon }) => {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-8 flex flex-col items-center justify-center text-center border border-slate-100 dark:border-slate-700">
      {icon && <div className="text-blue-400 dark:text-blue-500 mb-3">{icon}</div>}
      <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-2">{title}</h3>
      <p className="text-slate-500 dark:text-slate-300">{description}</p>
    </div>
  );
};

export default EmptyState;
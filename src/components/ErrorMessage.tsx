import React from 'react';
import { AlertCircle } from 'lucide-react';

interface ErrorMessageProps {
  error: string;
  className?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ error, className = '' }) => {
  if (!error) return null;
  
  return (
    <div 
      role="alert"
      className={`bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-md my-4 flex items-start ${className}`}
    >
      <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
      <div>
        <p className="font-medium">Error</p>
        <p className="text-sm">{error}</p>
      </div>
    </div>
  );
};

export default ErrorMessage;
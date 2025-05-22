import React from 'react';

interface LoadingTransitionProps {
  children: React.ReactNode;
  loading: boolean;
  minHeight?: string;
  showSpinner?: boolean;
}

const LoadingTransition: React.FC<LoadingTransitionProps> = ({
  children,
  loading,
  minHeight = '200px',
  showSpinner = true
}) => {
  if (loading) {
    return (
      <div 
        className={`flex items-center justify-center`} 
        style={{ minHeight }}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        {showSpinner && (
          <div className="text-center">
            <div 
              className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"
              aria-hidden="true"
            ></div>
            <p className="text-slate-600 dark:text-slate-300">Loading...</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="transition-opacity duration-200 opacity-100" aria-live="polite" aria-busy="false">
      {children}
    </div>
  );
};

export default LoadingTransition;
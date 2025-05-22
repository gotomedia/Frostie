import React from 'react';

interface SkipLinkProps {
  target?: string;
  label?: string;
}

const SkipLink: React.FC<SkipLinkProps> = ({
  target = "main-content",
  label = "Skip to main content"
}) => {
  return (
    <a
      href={`#${target}`}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:p-4 focus:bg-white dark:focus:bg-slate-800 focus:border focus:border-blue-500 focus:rounded-md focus:outline-none"
    >
      {label}
    </a>
  );
};

export default SkipLink;
import React, { useState, useEffect } from 'react';
import { freezerTips, getCategoryIcon } from '../data/freezerTips';

const FreezerTip: React.FC = () => {
  // Use useState and useEffect to select a random tip only once when the component mounts
  const [tip, setTip] = useState(() => {
    const randomIndex = Math.floor(Math.random() * freezerTips.length);
    return freezerTips[randomIndex];
  });
  
  return (
    <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg text-sm text-green-700 dark:text-green-300">
      <div className="flex items-start mb-2">
        <span className="text-green-600 dark:text-green-400 mr-2 mt-0.5">
          {getCategoryIcon(tip.category)}
        </span>
        <p className="font-medium">{tip.title}</p>
      </div>
      <p>{tip.content}</p>
    </div>
  );
};

export default FreezerTip;
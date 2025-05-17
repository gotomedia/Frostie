import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  path: string;
}

interface NavbarProps {
  navItems: NavItem[];
  currentPath: string;
  isDesktop: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ 
  navItems, 
  currentPath,
  isDesktop
}) => {
  if (isDesktop) {
    // Desktop sidebar navigation
    return (
      <aside className="fixed left-0 top-0 h-full w-64 bg-white dark:bg-slate-800 shadow-sm p-4 hidden md:block">
        <div className="flex items-center gap-3 mb-8 mt-2 px-2">
          <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-2 text-blue-600 dark:text-blue-400">
            {navItems[0].icon}
          </div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">Frostie</h2>
        </div>
        
        <nav aria-label="Main Navigation">
          <ul className="space-y-1" role="list">
            {navItems.map(item => (
              <li key={item.id} role="listitem">
                <Link
                  to={item.path}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    currentPath === item.path || (currentPath === '/' && item.path === '/') 
                      ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' 
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                  }`}
                  aria-current={currentPath === item.path ? 'page' : undefined}
                  aria-label={item.label}
                >
                  <span className="text-inherit" aria-hidden="true">{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    );
  }
  
  // Mobile bottom tab navigation
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 z-10 md:hidden" aria-label="Main Navigation">
      <ul className="flex" role="list">
        {navItems.map(item => (
          <li key={item.id} className="flex-1" role="listitem">
            <Link
              to={item.path}
              className={`w-full flex flex-col items-center gap-1 py-3 ${
                currentPath === item.path || (currentPath === '/' && item.path === '/') 
                  ? 'text-blue-600 dark:text-blue-400' 
                  : 'text-slate-600 dark:text-slate-300'
              }`}
              aria-current={currentPath === item.path ? 'page' : undefined}
              aria-label={item.label}
            >
              <span aria-hidden="true">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navbar;
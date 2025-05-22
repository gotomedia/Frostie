import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Snowflake, Home, Refrigerator, ShoppingCart, ChefHat, Settings } from 'lucide-react';
import { Toaster, toast } from 'react-hot-toast';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import FreezerPage from './pages/FreezerPage';
import ShoppingPage from './pages/ShoppingPage';
import IdeasPage from './pages/IdeasPage';
import SettingsPage from './pages/SettingsPage';
import { useTheme } from './contexts/ThemeContext';
import { 
  initSupabase, 
  handleAuthRedirect,
} from './api/supabase';
import { AuthContext, AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { StorageProvider } from './store/StorageContext';

const AppContent: React.FC = () => {
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const { resolvedTheme } = useTheme();
  const { user } = React.useContext(AuthContext);
  const location = useLocation();

  // Initialize Supabase and handle auth callback
  useEffect(() => {
    const initialize = async () => {
      console.log('Initializing app, checking for auth redirects...');
      initSupabase();
      await handleAuthRedirect();
    };
    
    initialize();
  }, []);

  // Check screen size for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Navigation items
  const navItems = [
    { id: 'home', label: 'Home', icon: <Home size={20} />, path: '/' },
    { id: 'freezer', label: 'Freezer', icon: <Refrigerator size={20} />, path: '/freezer' },
    { id: 'shopping', label: 'Shopping', icon: <ShoppingCart size={20} />, path: '/shopping' },
    { id: 'ideas', label: 'Ideas', icon: <ChefHat size={20} />, path: '/ideas' },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} />, path: '/settings' }
  ];

  return (
    <div className={`flex min-h-screen bg-slate-50 dark:bg-slate-900`}>
      <Navbar 
        navItems={navItems}
        currentPath={location.pathname}
        isDesktop={isDesktop}
      />
      
      <main className="flex-1 p-4 md:p-6 ml-0 md:ml-64">
        <header className="flex items-center gap-2 mb-6">
          <Snowflake className="text-blue-500" size={28} aria-hidden="true" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Frostie</h1>
        </header>
        
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/freezer" element={<FreezerPage />} />
          <Route path="/shopping" element={<ShoppingPage />} />
          <Route path="/ideas" element={<IdeasPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      
      {/* Toast notifications */}
      <Toaster 
        position="bottom-center"
        toastOptions={{
          style: {
            background: resolvedTheme === 'dark' ? '#334155' : '#ffffff',
            color: resolvedTheme === 'dark' ? '#f1f5f9' : '#1e293b',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            border: resolvedTheme === 'dark' ? '1px solid #475569' : '1px solid #e2e8f0',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: 'white',
            },
          },
        }}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <StorageProvider>
          <SettingsProvider>
            <AppContent />
          </SettingsProvider>
        </StorageProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Snowflake, Home, Refrigerator, ShoppingCart, ChefHat, Settings } from 'lucide-react';
import ShadcnInputBar from './components/ShadcnInputBar';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import FreezerPage from './pages/FreezerPage';
import ShoppingPage from './pages/ShoppingPage';
import IdeasPage from './pages/IdeasPage';
import SettingsPage from './pages/SettingsPage';
import { FreezerItem, ShoppingItem, MealIdea } from './types';
import { getStoredItems, storeItems } from './utils/storage';
import { useTheme } from './contexts/ThemeContext';
import { 
  initSupabase, 
  fetchFreezerItems as fetchFreezerItemsFromSupabase,
  addFreezerItem as addFreezerItemToSupabase,
  updateFreezerItem as updateFreezerItemInSupabase,
  deleteFreezerItem as deleteFreezerItemFromSupabase,
  fetchShoppingItems as fetchShoppingItemsFromSupabase,
  addShoppingItem as addShoppingItemToSupabase,
  updateShoppingItem as updateShoppingItemInSupabase,
  deleteShoppingItem as deleteShoppingItemFromSupabase,
  generateMealIdeas as generateMealIdeasFromApi,
  recognizeImageContent,
  scanBarcode,
  searchOpenFoodFacts,
  handleAuthRedirect,
  setupAuthListener,
  getCurrentUser,
  subscribeToFreezerItems,
  subscribeToShoppingItems,
  fetchUserSettings,
  UserSettings
} from './api/supabase';
import { AuthContext, AuthProvider } from './contexts/AuthContext';
import { parseItemText, createFreezerItemFromParsedText } from './utils/textParser';
import { SettingsProvider } from './contexts/SettingsContext';

const AppContent: React.FC = () => {
  const [freezerItems, setFreezerItems] = useState<FreezerItem[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [mealIdeas, setMealIdeas] = useState<MealIdea[]>([]);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
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

  // Load user settings
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const settings = await fetchUserSettings();
        if (settings) {
          console.log('Loaded user settings:', settings);
          setUserSettings(settings);
        }
      } catch (error) {
        console.error('Error loading user settings:', error);
      }
    };
    
    loadUserSettings();
  }, [user]); // Reload when user changes

  useEffect(() => {
    // Load data from either Supabase (if logged in) or localStorage
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        if (user) {
          // User is authenticated, fetch data from Supabase
          console.log('Fetching data from Supabase for user:', user.id);
          const [freezerData, shoppingData] = await Promise.all([
            fetchFreezerItemsFromSupabase(),
            fetchShoppingItemsFromSupabase()
          ]);
          
          setFreezerItems(freezerData);
          setShoppingItems(shoppingData);
          
          // Also set up real-time subscriptions
          const freezerSubscription = subscribeToFreezerItems(
            (newItem) => setFreezerItems(prev => [newItem, ...prev]),
            (updatedItem) => setFreezerItems(prev => 
              prev.map(item => item.id === updatedItem.id ? updatedItem : item)
            ),
            (deletedId) => setFreezerItems(prev => 
              prev.filter(item => item.id !== deletedId)
            )
          );
          
          const shoppingSubscription = subscribeToShoppingItems(
            (newItem) => setShoppingItems(prev => [newItem, ...prev]),
            (updatedItem) => setShoppingItems(prev => 
              prev.map(item => item.id === updatedItem.id ? updatedItem : item)
            ),
            (deletedId) => setShoppingItems(prev => 
              prev.filter(item => item.id !== deletedId)
            )
          );
          
          // Clean up subscriptions on unmount
          return () => {
            freezerSubscription?.unsubscribe();
            shoppingSubscription?.unsubscribe();
          };
        } else {
          // No user, load from localStorage
          console.log('Loading data from localStorage...');
          const storedFreezerItems = getStoredItems('freezerItems') as FreezerItem[];
          const storedShoppingItems = getStoredItems('shoppingItems') as ShoppingItem[];
          const storedMealIdeas = getStoredItems('mealIdeas') as MealIdea[];

          if (storedFreezerItems) setFreezerItems(storedFreezerItems);
          if (storedShoppingItems) setShoppingItems(storedShoppingItems);
          if (storedMealIdeas) setMealIdeas(storedMealIdeas);
        }
      } catch (err) {
        setError('Failed to load data. Please try again later.');
        console.error('Error loading data:', err);
        
        // Fallback to localStorage if Supabase fails
        const storedFreezerItems = getStoredItems('freezerItems') as FreezerItem[];
        const storedShoppingItems = getStoredItems('shoppingItems') as ShoppingItem[];
        const storedMealIdeas = getStoredItems('mealIdeas') as MealIdea[];

        if (storedFreezerItems) setFreezerItems(storedFreezerItems);
        if (storedShoppingItems) setShoppingItems(storedShoppingItems);
        if (storedMealIdeas) setMealIdeas(storedMealIdeas);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user]); // Reload when user authentication state changes

  // Save data to localStorage when it changes (only if not authenticated)
  useEffect(() => {
    if (!user) {
      storeItems('freezerItems', freezerItems);
    }
  }, [freezerItems, user]);

  useEffect(() => {
    if (!user) {
      storeItems('shoppingItems', shoppingItems);
    }
  }, [shoppingItems, user]);

  useEffect(() => {
    if (!user) {
      storeItems('mealIdeas', mealIdeas);
    }
  }, [mealIdeas, user]);

  // Check screen size for responsive layout
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Add item to freezer using advanced text parsing
  const handleAddFreezerItem = async (itemName: string) => {
    // Log the input text for debugging
    console.log('================ TEXT PARSING DEBUG ================');
    console.log('Raw input text:', itemName);
    
    try {
      // Use the parser to create a new freezer item - now with user's default expiration days setting
      const newItem = await createFreezerItemFromParsedText(itemName);
      console.log('Created freezer item:', newItem);
      console.log('================ END DEBUG ================');

      if (user) {
        try {
          // Add to Supabase if user is authenticated
          const addedItem = await addFreezerItemToSupabase(newItem);
          setFreezerItems(prev => [addedItem, ...prev]);
        } catch (error) {
          console.error('Failed to add item to Supabase:', error);
          setFreezerItems(prev => [newItem, ...prev]); // Fall back to local state
        }
      } else {
        // Add to local state only
        setFreezerItems(prev => [newItem, ...prev]);
      }
    } catch (error) {
      console.error('Error creating freezer item:', error);
      // Fall back to a basic item creation if everything fails
      
      // Get the default expiration days
      const defaultExpirationDays = userSettings?.expirationDays || 30;
      console.log('Using default expiration days for fallback:', defaultExpirationDays);
      
      const today = new Date();
      const expirationDate = new Date(today);
      expirationDate.setDate(today.getDate() + defaultExpirationDays);
      
      const basicItem: FreezerItem = {
        id: Date.now().toString(),
        name: itemName,
        addedDate: new Date(),
        expirationDate: expirationDate,
        category: 'Other',
        quantity: 1,
        size: '',
        tags: [],
        notes: ''
      };
      setFreezerItems(prev => [basicItem, ...prev]);
    }
  };

  const handleUpdateFreezerItem = async (updatedItem: FreezerItem) => {
    if (user) {
      try {
        // Update in Supabase if user is authenticated
        await updateFreezerItemInSupabase(updatedItem);
        setFreezerItems(prev => 
          prev.map(item => 
            item.id === updatedItem.id ? updatedItem : item
          )
        );
      } catch (error) {
        console.error('Failed to update item in Supabase:', error);
        // Fall back to local state update
        setFreezerItems(prev => 
          prev.map(item => 
            item.id === updatedItem.id ? updatedItem : item
          )
        );
      }
    } else {
      // Update local state only
      setFreezerItems(prev => 
        prev.map(item => 
          item.id === updatedItem.id ? updatedItem : item
        )
      );
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      // Use the API to recognize the image content
      const recognizedText = await recognizeImageContent(file);
      await handleAddFreezerItem(recognizedText);
    } catch (error) {
      console.error('Error processing image:', error);
      // Fall back to mock implementation
      const fileType = file.type.split('/')[1];
      const mockRecognizedItem = getMockRecognizedItem(fileType);
      await handleAddFreezerItem(mockRecognizedItem);
    }
  };

  const handleBarcodeScanned = async (barcode: string) => {
    try {
      // Look up the product name using the barcode
      let productName = await searchOpenFoodFacts(barcode);
      
      // If product lookup fails, use a generic format
      if (!productName) {
        productName = `Scanned Item ${barcode.substring(0, 8)} #other`;
      }
      
      // Add the item to the freezer
      await handleAddFreezerItem(productName);
    } catch (error) {
      console.error('Error processing barcode:', error);
      // Fall back to mock implementation
      const mockItem = `Scanned Item ${barcode.substring(0, 4)}`;
      await handleAddFreezerItem(mockItem);
    }
  };

  const handleVoiceInput = (transcript: string) => {
    // Use the transcript directly
    handleAddFreezerItem(transcript);
  };

  // Shopping list handlers
  const handleAddShoppingItem = async (itemName: string) => {
    const newItem: ShoppingItem = {
      id: Date.now().toString(),
      name: itemName,
      completed: false,
      category: guessCategory(itemName),
    };
    
    if (user) {
      try {
        // Add to Supabase if user is authenticated
        const addedItem = await addShoppingItemToSupabase(newItem);
        setShoppingItems(prev => [addedItem, ...prev]);
      } catch (error) {
        console.error('Failed to add shopping item to Supabase:', error);
        setShoppingItems(prev => [newItem, ...prev]); // Fall back to local state
      }
    } else {
      // Add to local state only
      setShoppingItems(prev => [newItem, ...prev]);
    }
  };

  const toggleShoppingItem = async (id: string) => {
    const itemToUpdate = shoppingItems.find(item => item.id === id);
    if (!itemToUpdate) return;
    
    const updatedItem = { ...itemToUpdate, completed: !itemToUpdate.completed };
    
    if (user) {
      try {
        // Update in Supabase if user is authenticated
        await updateShoppingItemInSupabase(updatedItem);
        setShoppingItems(prev => 
          prev.map(item => 
            item.id === id ? updatedItem : item
          )
        );
      } catch (error) {
        console.error('Failed to update shopping item in Supabase:', error);
        // Fall back to local state update
        setShoppingItems(prev => 
          prev.map(item => 
            item.id === id ? updatedItem : item
          )
        );
      }
    } else {
      // Update local state only
      setShoppingItems(prev => 
        prev.map(item => 
          item.id === id ? updatedItem : item
        )
      );
    }
  };

  const updateShoppingItem = async (updatedItem: ShoppingItem) => {
    if (user) {
      try {
        // Update in Supabase if user is authenticated
        await updateShoppingItemInSupabase(updatedItem);
        setShoppingItems(prev => 
          prev.map(item => 
            item.id === updatedItem.id ? updatedItem : item
          )
        );
      } catch (error) {
        console.error('Failed to update shopping item in Supabase:', error);
        // Fall back to local state update
        setShoppingItems(prev => 
          prev.map(item => 
            item.id === updatedItem.id ? updatedItem : item
          )
        );
      }
    } else {
      // Update local state only
      setShoppingItems(prev => 
        prev.map(item => 
          item.id === updatedItem.id ? updatedItem : item
        )
      );
    }
  };

  const removeFreezerItem = async (id: string) => {
    if (user) {
      try {
        // Delete from Supabase if user is authenticated
        await deleteFreezerItemFromSupabase(id);
        setFreezerItems(prev => prev.filter(item => item.id !== id));
      } catch (error) {
        console.error('Failed to delete freezer item from Supabase:', error);
        // Fall back to local state update
        setFreezerItems(prev => prev.filter(item => item.id !== id));
      }
    } else {
      // Update local state only
      setFreezerItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const removeShoppingItem = async (id: string) => {
    if (user) {
      try {
        // Delete from Supabase if user is authenticated
        await deleteShoppingItemFromSupabase(id);
        setShoppingItems(prev => prev.filter(item => item.id !== id));
      } catch (error) {
        console.error('Failed to delete shopping item from Supabase:', error);
        // Fall back to local state update
        setShoppingItems(prev => prev.filter(item => item.id !== id));
      }
    } else {
      // Update local state only
      setShoppingItems(prev => prev.filter(item => item.id !== id));
    }
  };

  // Guess category based on item name (simple implementation)
  const guessCategory = (itemName: string): string => {
    const lowerCaseName = itemName.toLowerCase();
    if (lowerCaseName.includes('meat') || lowerCaseName.includes('chicken') || 
        lowerCaseName.includes('beef') || lowerCaseName.includes('pork') || 
        lowerCaseName.includes('turkey') || lowerCaseName.includes('lamb')) {
      return 'Meat & Poultry';
    } else if (lowerCaseName.includes('fish') || lowerCaseName.includes('shrimp') || 
               lowerCaseName.includes('seafood') || lowerCaseName.includes('scallop')) {
      return 'Seafood';
    } else if (lowerCaseName.includes('vegetable') || lowerCaseName.includes('veg') || 
               lowerCaseName.includes('fruit') || lowerCaseName.includes('berry')) {
      return 'Fruits & Vegetables';
    } else if (lowerCaseName.includes('leftover') || lowerCaseName.includes('meal prep')) {
      return 'Prepared Meals';
    } else if (lowerCaseName.includes('dinner') || lowerCaseName.includes('pizza') || 
               lowerCaseName.includes('breakfast')) {
      return 'Ready-to-Eat';
    } else if (lowerCaseName.includes('bread') || lowerCaseName.includes('dough') || 
               lowerCaseName.includes('pastry')) {
      return 'Bakery & Bread';
    } else if (lowerCaseName.includes('ice cream') || lowerCaseName.includes('butter') || 
               lowerCaseName.includes('cheese') || lowerCaseName.includes('milk')) {
      return 'Dairy & Alternatives';
    } else if (lowerCaseName.includes('soup') || lowerCaseName.includes('broth') || 
               lowerCaseName.includes('stock')) {
      return 'Soups & Broths';
    } else if (lowerCaseName.includes('herb') || lowerCaseName.includes('spice') || 
               lowerCaseName.includes('season')) {
      return 'Herbs & Seasonings';
    }
    return 'Other';
  };

  // Mock image recognition
  const getMockRecognizedItem = (fileType: string): string => {
    const mockItems = [
      'Frozen Chicken Breast 500g #protein',
      'Ice Cream 1L #dessert',
      'Frozen Pizza 12" #dinner',
      'Frozen Vegetables 250g #healthy',
      'Homemade Soup 500ml #leftovers'
    ];
    return mockItems[Math.floor(Math.random() * mockItems.length)];
  };

  // Generate meal ideas based on freezer inventory
  const generateMealIdeas = async () => {
    try {
      // Use the API to generate meal ideas
      const ideas = await generateMealIdeasFromApi(freezerItems);
      setMealIdeas(prev => [...ideas, ...prev]);
      return ideas;
    } catch (error) {
      console.error('Error generating meal ideas:', error);
      
      // Simple mock implementation - would be replaced with AI in Phase 2
      const mealSuggestions = [
        {
          id: Date.now().toString(),
          title: 'Chicken Stir Fry',
          description: 'Quick and easy stir fry with frozen vegetables and chicken.',
          ingredients: ['Chicken', 'Vegetables', 'Soy Sauce'],
          imageUrl: 'https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg',
          matchedItems: freezerItems.filter(item => 
            item.name.toLowerCase().includes('chicken') || 
            item.name.toLowerCase().includes('vegetable')
          ).map(item => item.name),
        },
        {
          id: (Date.now() + 1).toString(),
          title: 'Homemade Pizza',
          description: 'Use that frozen dough to make a delicious homemade pizza.',
          ingredients: ['Pizza Dough', 'Sauce', 'Cheese', 'Toppings'],
          imageUrl: 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg',
          matchedItems: freezerItems.filter(item => 
            item.name.toLowerCase().includes('pizza') || 
            item.name.toLowerCase().includes('dough')
          ).map(item => item.name),
        }
      ];
      
      setMealIdeas(prev => [...mealSuggestions, ...prev]);
      return mealSuggestions;
    }
  };

  // Loading state component
  const LoadingState = () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-slate-600 dark:text-slate-300">Loading your data...</p>
      </div>
    </div>
  );

  // Error state component
  const ErrorState = () => (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 my-4">
      <p className="font-bold">Error</p>
      <p>{error}</p>
    </div>
  );

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
        
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState />
        ) : (
          <Routes>
            <Route path="/" element={
              <HomePage 
                freezerItems={freezerItems}
                expiringItems={freezerItems.filter(item => {
                  const today = new Date();
                  const expirationDate = new Date(item.expirationDate);
                  const diffTime = expirationDate.getTime() - today.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  return diffDays <= 7;
                })}
                shoppingItems={shoppingItems.filter(item => !item.completed).slice(0, 3)}
                mealIdeas={mealIdeas.slice(0, 2)}
                onAddItem={handleAddFreezerItem}
                onImageUpload={handleImageUpload}
                onBarcodeScanned={handleBarcodeScanned}
                onVoiceInput={handleVoiceInput}
                generateMealIdeas={generateMealIdeas}
              />
            } />
            <Route path="/freezer" element={
              <FreezerPage 
                freezerItems={freezerItems}
                onAddItem={handleAddFreezerItem}
                onImageUpload={handleImageUpload}
                onBarcodeScanned={handleBarcodeScanned}
                onVoiceInput={handleVoiceInput}
                onRemoveItem={removeFreezerItem}
                onUpdateItem={handleUpdateFreezerItem}
              />
            } />
            <Route path="/shopping" element={
              <ShoppingPage 
                shoppingItems={shoppingItems}
                onAddItem={handleAddShoppingItem}
                onToggleItem={toggleShoppingItem}
                onRemoveItem={removeShoppingItem}
                onUpdateItem={updateShoppingItem}
              />
            } />
            <Route path="/ideas" element={
              <IdeasPage 
                mealIdeas={mealIdeas}
                freezerItems={freezerItems}
                generateMealIdeas={generateMealIdeas}
              />
            } />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        )}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <SettingsProvider>
        <Router>
          <AppContent />
        </Router>
      </SettingsProvider>
    </AuthProvider>
  );
};

export default App;
import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import {
  FreezerItemsStorage,
  FreezerItemsLocalStorage,
  FreezerItemsSupabase,
  ShoppingItemsStorage,
  ShoppingItemsLocalStorage,
  ShoppingItemsSupabase,
  MealIdeasStorage,
  MealIdeasLocalStorage,
  MealIdeasSupabase,
  SettingsStorage,
  SettingsLocalStorage,
  SettingsSupabase
} from './storage';
import { FreezerItem, ShoppingItem, MealIdea, UserSettings } from '../types';
import { supabase } from '../api/services/client';
import { AuthContext } from '../contexts/AuthContext';
import { debounce } from '../lib/utils';

// Define the Storage context type
interface StorageContextType {
  freezerItems: {
    items: FreezerItem[];
    loading: boolean;
    error: Error | null;
    getItems: () => Promise<FreezerItem[]>;
    addItem: (item: FreezerItem) => Promise<FreezerItem>;
    updateItem: (item: FreezerItem) => Promise<FreezerItem>;
    deleteItem: (id: string) => Promise<void>;
    getExpiringItems: (days: number) => Promise<FreezerItem[]>;
  };
  
  shoppingItems: {
    items: ShoppingItem[];
    loading: boolean;
    error: Error | null;
    getItems: () => Promise<ShoppingItem[]>;
    addItem: (item: ShoppingItem) => Promise<ShoppingItem>;
    updateItem: (item: ShoppingItem) => Promise<ShoppingItem>;
    deleteItem: (id: string) => Promise<void>;
    getCompletedItems: () => Promise<ShoppingItem[]>;
    getIncompleteItems: () => Promise<ShoppingItem[]>;
  };
  
  mealIdeas: {
    items: MealIdea[];
    loading: boolean;
    error: Error | null;
    getItems: () => Promise<MealIdea[]>;
    addItem: (item: MealIdea) => Promise<MealIdea>;
    updateItem: (item: MealIdea) => Promise<MealIdea>;
    deleteItem: (id: string) => Promise<void>;
    getFavorites: () => Promise<MealIdea[]>;
  };
  
  settings: {
    settings: UserSettings | null;
    loading: boolean;
    error: Error | null;
    getSettings: () => Promise<UserSettings | null>;
    saveSettings: (settings: UserSettings) => Promise<void>;
  };
  
  isAuthenticated: boolean;
  isInitializing: boolean;
}

// Default user settings
const defaultUserSettings: UserSettings = {
  theme: 'system',
  notifications: true,
  notificationTiming: 3,
  dietary: {
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    dairyFree: false
  }
};

// Create the context with a default value
const StorageContext = createContext<StorageContextType | undefined>(undefined);

// Provider props interface
interface StorageProviderProps {
  children: ReactNode;
}

// Create a provider component
export const StorageProvider: React.FC<StorageProviderProps> = ({ children }) => {
  const { user, isLoading: authLoading } = useContext(AuthContext);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Storage providers
  const [freezerStorage, setFreezerStorage] = useState<FreezerItemsStorage>(
    new FreezerItemsLocalStorage()
  );
  
  const [shoppingStorage, setShoppingStorage] = useState<ShoppingItemsStorage>(
    new ShoppingItemsLocalStorage()
  );
  
  const [mealStorage, setMealStorage] = useState<MealIdeasStorage>(
    new MealIdeasLocalStorage()
  );
  
  const [settingsStorage, setSettingsStorage] = useState<SettingsStorage>(
    new SettingsLocalStorage()
  );
  
  // Data states
  const [freezerItems, setFreezerItems] = useState<FreezerItem[]>([]);
  const [freezerLoading, setFreezerLoading] = useState(true);
  const [freezerError, setFreezerError] = useState<Error | null>(null);
  
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [shoppingLoading, setShoppingLoading] = useState(true);
  const [shoppingError, setShoppingError] = useState<Error | null>(null);
  
  const [mealIdeas, setMealIdeas] = useState<MealIdea[]>([]);
  const [mealLoading, setMealLoading] = useState(true);
  const [mealError, setMealError] = useState<Error | null>(null);
  
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<Error | null>(null);
  
  // Setup storage providers based on authentication state
  useEffect(() => {
    if (authLoading) return;
    
    console.log('Setting up storage providers, user:', user?.id);
    
    if (user) {
      // User is authenticated, use Supabase providers
      setFreezerStorage(new FreezerItemsSupabase(supabase, user.id));
      setShoppingStorage(new ShoppingItemsSupabase(supabase, user.id));
      setMealStorage(new MealIdeasSupabase(supabase, user.id)); // Pass user ID to MealIdeasSupabase
      setSettingsStorage(new SettingsSupabase(supabase, user.id));
    } else {
      // User is not authenticated, use LocalStorage providers
      setFreezerStorage(new FreezerItemsLocalStorage());
      setShoppingStorage(new ShoppingItemsLocalStorage());
      setMealStorage(new MealIdeasLocalStorage());
      setSettingsStorage(new SettingsLocalStorage());
    }
    
    // Mark initialization as complete when providers are set
    setIsInitializing(false);
    
  }, [user, authLoading]);
  
  // Debounced refresh functions to avoid rapid re-renders
  const debouncedRefreshFreezerItems = useCallback(
    debounce(async () => {
      try {
        const items = await freezerStorage.getItems();
        setFreezerItems(items);
      } catch (err) {
        console.error('Error refreshing freezer items:', err);
      }
    }, 500),
    [freezerStorage]
  );
  
  const debouncedRefreshShoppingItems = useCallback(
    debounce(async () => {
      try {
        const items = await shoppingStorage.getItems();
        setShoppingItems(items);
      } catch (err) {
        console.error('Error refreshing shopping items:', err);
      }
    }, 500),
    [shoppingStorage]
  );
  
  const debouncedRefreshMealIdeas = useCallback(
    debounce(async () => {
      try {
        const items = await mealStorage.getItems();
        setMealIdeas(items);
      } catch (err) {
        console.error('Error refreshing meal ideas:', err);
      }
    }, 500),
    [mealStorage]
  );
  
  // Load freezer items whenever the storage provider changes
  useEffect(() => {
    const loadFreezerItems = async () => {
      try {
        setFreezerLoading(true);
        setFreezerError(null);
        const items = await freezerStorage.getItems();
        setFreezerItems(items);
      } catch (err) {
        console.error('Error loading freezer items:', err);
        setFreezerError(err as Error);
      } finally {
        setFreezerLoading(false);
      }
    };
    
    if (!isInitializing) {
      loadFreezerItems();
    }
  }, [freezerStorage, isInitializing]);
  
  // Load shopping items whenever the storage provider changes
  useEffect(() => {
    const loadShoppingItems = async () => {
      try {
        setShoppingLoading(true);
        setShoppingError(null);
        const items = await shoppingStorage.getItems();
        setShoppingItems(items);
      } catch (err) {
        console.error('Error loading shopping items:', err);
        setShoppingError(err as Error);
      } finally {
        setShoppingLoading(false);
      }
    };
    
    if (!isInitializing) {
      loadShoppingItems();
    }
  }, [shoppingStorage, isInitializing]);
  
  // Load meal ideas whenever the storage provider changes
  useEffect(() => {
    const loadMealIdeas = async () => {
      try {
        setMealLoading(true);
        setMealError(null);
        const items = await mealStorage.getItems();
        setMealIdeas(items);
      } catch (err) {
        console.error('Error loading meal ideas:', err);
        setMealError(err as Error);
      } finally {
        setMealLoading(false);
      }
    };
    
    if (!isInitializing) {
      loadMealIdeas();
    }
  }, [mealStorage, isInitializing]);
  
  // Load user settings whenever the storage provider changes
  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        setSettingsLoading(true);
        setSettingsError(null);
        const settings = await settingsStorage.getSettings();
        setUserSettings(settings || defaultUserSettings);
      } catch (err) {
        console.error('Error loading user settings:', err);
        setSettingsError(err as Error);
        // Fall back to default settings
        setUserSettings(defaultUserSettings);
      } finally {
        setSettingsLoading(false);
      }
    };
    
    if (!isInitializing) {
      loadUserSettings();
    }
  }, [settingsStorage, isInitializing]);
  
  // Define freezer item operations with optimistic updates
  const getFreezerItems = async (): Promise<FreezerItem[]> => {
    try {
      setFreezerLoading(true);
      setFreezerError(null);
      const items = await freezerStorage.getItems();
      setFreezerItems(items);
      return items;
    } catch (err) {
      console.error('Error loading freezer items:', err);
      setFreezerError(err as Error);
      throw err;
    } finally {
      setFreezerLoading(false);
    }
  };
  
  const addFreezerItem = async (item: FreezerItem): Promise<FreezerItem> => {
    try {
      // Optimistic update - add to state immediately
      const newItems = [...freezerItems, item];
      setFreezerItems(newItems);
      
      // Perform actual operation
      const newItem = await freezerStorage.addItem(item);
      
      // Refresh list with debounce to prevent rapid re-renders
      debouncedRefreshFreezerItems();
      
      return newItem;
    } catch (err) {
      // Revert optimistic update on error
      debouncedRefreshFreezerItems();
      console.error('Error adding freezer item:', err);
      throw err;
    }
  };
  
  const updateFreezerItem = async (item: FreezerItem): Promise<FreezerItem> => {
    try {
      // Optimistic update - update in state immediately
      const newItems = freezerItems.map(i => i.id === item.id ? item : i);
      setFreezerItems(newItems);
      
      // Perform actual operation
      const updatedItem = await freezerStorage.updateItem(item);
      
      // Refresh list with debounce
      debouncedRefreshFreezerItems();
      
      return updatedItem;
    } catch (err) {
      // Revert optimistic update on error
      debouncedRefreshFreezerItems();
      console.error('Error updating freezer item:', err);
      throw err;
    }
  };
  
  const deleteFreezerItem = async (id: string): Promise<void> => {
    try {
      // Optimistic update - remove from state immediately
      const newItems = freezerItems.filter(i => i.id !== id);
      setFreezerItems(newItems);
      
      // Perform actual operation
      await freezerStorage.deleteItem(id);
      
      // Refresh list with debounce
      debouncedRefreshFreezerItems();
    } catch (err) {
      // Revert optimistic update on error
      debouncedRefreshFreezerItems();
      console.error('Error deleting freezer item:', err);
      throw err;
    }
  };
  
  const getExpiringFreezerItems = async (days: number): Promise<FreezerItem[]> => {
    try {
      return await freezerStorage.getExpiringItems(days);
    } catch (err) {
      console.error('Error getting expiring freezer items:', err);
      throw err;
    }
  };
  
  // Define shopping item operations with optimistic updates
  const getShoppingItems = async (): Promise<ShoppingItem[]> => {
    try {
      setShoppingLoading(true);
      setShoppingError(null);
      const items = await shoppingStorage.getItems();
      setShoppingItems(items);
      return items;
    } catch (err) {
      console.error('Error loading shopping items:', err);
      setShoppingError(err as Error);
      throw err;
    } finally {
      setShoppingLoading(false);
    }
  };
  
  const addShoppingItem = async (item: ShoppingItem): Promise<ShoppingItem> => {
    try {
      // Optimistic update
      const newItems = [...shoppingItems, item];
      setShoppingItems(newItems);
      
      // Perform actual operation
      const newItem = await shoppingStorage.addItem(item);
      
      // Refresh with debounce
      debouncedRefreshShoppingItems();
      
      return newItem;
    } catch (err) {
      // Revert on error
      debouncedRefreshShoppingItems();
      console.error('Error adding shopping item:', err);
      throw err;
    }
  };
  
  const updateShoppingItem = async (item: ShoppingItem): Promise<ShoppingItem> => {
    try {
      // Optimistic update
      const newItems = shoppingItems.map(i => i.id === item.id ? item : i);
      setShoppingItems(newItems);
      
      // Perform actual operation
      const updatedItem = await shoppingStorage.updateItem(item);
      
      // Refresh with debounce
      debouncedRefreshShoppingItems();
      
      return updatedItem;
    } catch (err) {
      // Revert on error
      debouncedRefreshShoppingItems();
      console.error('Error updating shopping item:', err);
      throw err;
    }
  };
  
  const deleteShoppingItem = async (id: string): Promise<void> => {
    try {
      // Optimistic update
      const newItems = shoppingItems.filter(i => i.id !== id);
      setShoppingItems(newItems);
      
      // Perform actual operation
      await shoppingStorage.deleteItem(id);
      
      // Refresh with debounce
      debouncedRefreshShoppingItems();
    } catch (err) {
      // Revert on error
      debouncedRefreshShoppingItems();
      console.error('Error deleting shopping item:', err);
      throw err;
    }
  };
  
  const getCompletedShoppingItems = async (): Promise<ShoppingItem[]> => {
    try {
      return await shoppingStorage.getCompletedItems();
    } catch (err) {
      console.error('Error getting completed shopping items:', err);
      throw err;
    }
  };
  
  const getIncompleteShoppingItems = async (): Promise<ShoppingItem[]> => {
    try {
      return await shoppingStorage.getIncompleteItems();
    } catch (err) {
      console.error('Error getting incomplete shopping items:', err);
      throw err;
    }
  };
  
  // Define meal idea operations with optimistic updates
  const getMealIdeas = async (): Promise<MealIdea[]> => {
    try {
      setMealLoading(true);
      setMealError(null);
      const items = await mealStorage.getItems();
      setMealIdeas(items);
      return items;
    } catch (err) {
      console.error('Error loading meal ideas:', err);
      setMealError(err as Error);
      throw err;
    } finally {
      setMealLoading(false);
    }
  };
  
  const addMealIdea = async (item: MealIdea): Promise<MealIdea> => {
    try {
      // Create new item with user_id added
      const newIdea = {
        ...item,
        user_id: user?.id // Add user_id to the meal idea directly from the context
      };
      
      // Optimistic update
      const newItems = [...mealIdeas, newIdea];
      setMealIdeas(newItems);
      
      // Log the newIdea object to confirm user_id is present
      console.log('Adding meal idea with user_id:', newIdea);
      
      // Perform actual operation
      const newItem = await mealStorage.addItem(newIdea);
      
      // Refresh with debounce
      debouncedRefreshMealIdeas();
      
      return newItem;
    } catch (err) {
      // Revert on error
      debouncedRefreshMealIdeas();
      console.error('Error adding meal idea:', err);
      throw err;
    }
  };
  
  const updateMealIdea = async (item: MealIdea): Promise<MealIdea> => {
    try {
      // Optimistic update
      const newItems = mealIdeas.map(i => i.id === item.id ? item : i);
      setMealIdeas(newItems);
      
      // Perform actual operation
      const updatedItem = await mealStorage.updateItem(item);
      
      // Refresh with debounce
      debouncedRefreshMealIdeas();
      
      return updatedItem;
    } catch (err) {
      // Revert on error
      debouncedRefreshMealIdeas();
      console.error('Error updating meal idea:', err);
      throw err;
    }
  };
  
  const deleteMealIdea = async (id: string): Promise<void> => {
    try {
      // Optimistic update
      const newItems = mealIdeas.filter(i => i.id !== id);
      setMealIdeas(newItems);
      
      // Perform actual operation
      await mealStorage.deleteItem(id);
      
      // Refresh with debounce
      debouncedRefreshMealIdeas();
    } catch (err) {
      // Revert on error
      debouncedRefreshMealIdeas();
      console.error('Error deleting meal idea:', err);
      throw err;
    }
  };
  
  const getFavoriteMealIdeas = async (): Promise<MealIdea[]> => {
    try {
      return await mealStorage.getFavorites();
    } catch (err) {
      console.error('Error getting favorite meal ideas:', err);
      throw err;
    }
  };
  
  // Define user settings operations
  const getUserSettings = async (): Promise<UserSettings | null> => {
    try {
      setSettingsLoading(true);
      setSettingsError(null);
      const settings = await settingsStorage.getSettings();
      setUserSettings(settings || defaultUserSettings);
      return settings;
    } catch (err) {
      console.error('Error loading user settings:', err);
      setSettingsError(err as Error);
      throw err;
    } finally {
      setSettingsLoading(false);
    }
  };
  
  const saveUserSettings = async (settings: UserSettings): Promise<void> => {
    try {
      // Optimistic update
      setUserSettings(settings);
      
      // Perform actual operation
      await settingsStorage.saveSettings(settings);
    } catch (err) {
      // Revert on error by refreshing from storage
      try {
        const currentSettings = await settingsStorage.getSettings();
        setUserSettings(currentSettings);
      } catch {
        // If refresh fails, keep the optimistic update
      }
      console.error('Error saving user settings:', err);
      throw err;
    }
  };
  
  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo<StorageContextType>(() => ({
    freezerItems: {
      items: freezerItems,
      loading: freezerLoading,
      error: freezerError,
      getItems: getFreezerItems,
      addItem: addFreezerItem,
      updateItem: updateFreezerItem,
      deleteItem: deleteFreezerItem,
      getExpiringItems: getExpiringFreezerItems
    },
    
    shoppingItems: {
      items: shoppingItems,
      loading: shoppingLoading,
      error: shoppingError,
      getItems: getShoppingItems,
      addItem: addShoppingItem,
      updateItem: updateShoppingItem,
      deleteItem: deleteShoppingItem,
      getCompletedItems: getCompletedShoppingItems,
      getIncompleteItems: getIncompleteShoppingItems
    },
    
    mealIdeas: {
      items: mealIdeas,
      loading: mealLoading,
      error: mealError,
      getItems: getMealIdeas,
      addItem: addMealIdea,
      updateItem: updateMealIdea,
      deleteItem: deleteMealIdea,
      getFavorites: getFavoriteMealIdeas
    },
    
    settings: {
      settings: userSettings,
      loading: settingsLoading,
      error: settingsError,
      getSettings: getUserSettings,
      saveSettings: saveUserSettings
    },
    
    isAuthenticated: !!user,
    isInitializing: isInitializing || authLoading
  }), [
    freezerItems, freezerLoading, freezerError,
    shoppingItems, shoppingLoading, shoppingError,
    mealIdeas, mealLoading, mealError,
    userSettings, settingsLoading, settingsError,
    user, isInitializing, authLoading
  ]);
  
  return (
    <StorageContext.Provider value={contextValue}>
      {children}
    </StorageContext.Provider>
  );
};

// Create a hook to use the storage context
export const useStorage = () => {
  const context = useContext(StorageContext);
  
  if (context === undefined) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  
  return context;
};
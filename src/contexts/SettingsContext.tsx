import React, { createContext, useContext, useEffect, useReducer } from 'react';
import { useTheme } from './ThemeContext';
import { useStorage } from '../store/StorageContext';
import { UserSettings } from '../api/supabase';

// Define the type for the settings state
interface SettingsState {
  settings: UserSettings;
  isLoading: boolean;
  error: string | null;
}

// Define the type for settings actions
type SettingsAction = 
  | { type: 'SET_SETTINGS'; payload: UserSettings }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' | 'system' }
  | { type: 'SET_NOTIFICATIONS'; payload: boolean }
  | { type: 'SET_NOTIFICATION_TIMING'; payload: number }
  | { type: 'LOADING' }
  | { type: 'ERROR'; payload: string }
  | { type: 'SAVE_SUCCESS' };

// Define the context shape
interface SettingsContextType {
  settings: UserSettings;
  isLoading: boolean;
  error: string | null;
  updateSettings: (settings: Partial<UserSettings>) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setNotifications: (enabled: boolean) => void;
  setNotificationTiming: (timing: number) => void;
  setDietary: (key: string, value: boolean) => void;
}

// Default settings
const defaultSettings: UserSettings = {
  theme: 'system',
  notifications: true,
  notificationTiming: 3, // Default to 3 days before
  dietary: {
    vegetarian: false,
    vegan: false,
    glutenFree: false,
    dairyFree: false
  }
};

// Create the context
const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Reducer function for settings state
function settingsReducer(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case 'SET_SETTINGS':
      return {
        ...state,
        settings: action.payload,
        isLoading: false
      };
    case 'SET_THEME':
      return {
        ...state,
        settings: {
          ...state.settings,
          theme: action.payload
        }
      };
    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        settings: {
          ...state.settings,
          notifications: action.payload
        }
      };
    case 'SET_NOTIFICATION_TIMING':
      return {
        ...state,
        settings: {
          ...state.settings,
          notificationTiming: action.payload
        }
      };
    case 'LOADING':
      return {
        ...state,
        isLoading: true,
        error: null
      };
    case 'ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload
      };
    case 'SAVE_SUCCESS':
      return {
        ...state,
        isLoading: false,
        error: null
      };
    default:
      return state;
  }
}

// Create provider component
export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { setTheme: setAppTheme } = useTheme();
  const { settings: storageSettings } = useStorage();
  
  // Initialize state with default settings
  const [state, dispatch] = useReducer(settingsReducer, {
    settings: defaultSettings,
    isLoading: true,
    error: null
  });
  
  // Load settings from storage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        dispatch({ type: 'LOADING' });
        
        if (storageSettings.loading) {
          return; // Wait for settings to load
        }
        
        if (storageSettings.settings) {
          dispatch({ type: 'SET_SETTINGS', payload: storageSettings.settings });
          // Update the theme context to match
          setAppTheme(storageSettings.settings.theme);
        } else {
          // If no settings found, use defaults
          dispatch({ type: 'SET_SETTINGS', payload: defaultSettings });
          
          // Save the defaults to storage
          await storageSettings.saveSettings(defaultSettings);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        dispatch({ 
          type: 'ERROR', 
          payload: error instanceof Error ? error.message : 'Failed to load settings'
        });
      }
    };
    
    loadSettings();
  }, [storageSettings, setAppTheme, storageSettings.loading]);
  
  // Save settings when they change
  useEffect(() => {
    const saveSettings = async () => {
      try {
        if (!state.isLoading && storageSettings.settings !== state.settings) {
          await storageSettings.saveSettings(state.settings);
          dispatch({ type: 'SAVE_SUCCESS' });
        }
      } catch (error) {
        console.error('Error saving settings:', error);
        dispatch({ 
          type: 'ERROR', 
          payload: error instanceof Error ? error.message : 'Failed to save settings'
        });
      }
    };
    
    saveSettings();
  }, [state.settings, state.isLoading, storageSettings]);
  
  // Update app theme when theme setting changes
  useEffect(() => {
    setAppTheme(state.settings.theme);
  }, [state.settings.theme, setAppTheme]);
  
  // Functions to update settings
  const updateSettings = (settings: Partial<UserSettings>) => {
    dispatch({
      type: 'SET_SETTINGS',
      payload: { ...state.settings, ...settings }
    });
  };
  
  const setTheme = (theme: 'light' | 'dark' | 'system') => {
    dispatch({ type: 'SET_THEME', payload: theme });
  };
  
  const setNotifications = (enabled: boolean) => {
    dispatch({ type: 'SET_NOTIFICATIONS', payload: enabled });
  };
  
  const setNotificationTiming = (timing: number) => {
    dispatch({ type: 'SET_NOTIFICATION_TIMING', payload: timing });
  };
  
  const setDietary = (key: string, value: boolean) => {
    dispatch({
      type: 'SET_SETTINGS',
      payload: {
        ...state.settings,
        dietary: {
          ...state.settings.dietary,
          [key]: value
        }
      }
    });
  };
  
  // Provide context
  return (
    <SettingsContext.Provider
      value={{
        settings: state.settings,
        isLoading: state.isLoading,
        error: state.error,
        updateSettings,
        setTheme,
        setNotifications,
        setNotificationTiming,
        setDietary
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

// Hook to use settings context
export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
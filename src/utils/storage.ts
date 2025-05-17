/**
 * Utility functions for local storage operations
 */

// Get items from localStorage with a given key
export const getStoredItems = (key: string): any[] => {
  try {
    const storedItems = localStorage.getItem(key);
    if (storedItems) {
      // Parse dates back to Date objects if they exist
      return JSON.parse(storedItems, (key, value) => {
        // Check if the value might be a date string (ISO format)
        if (typeof value === 'string' && 
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.*Z$/.test(value)) {
          return new Date(value);
        }
        return value;
      });
    }
  } catch (error) {
    console.error(`Error retrieving ${key} from localStorage:`, error);
  }
  return [];
};

// Store items in localStorage with a given key
export const storeItems = (key: string, items: any[]): void => {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (error) {
    console.error(`Error storing ${key} in localStorage:`, error);
  }
};

// Remove items from localStorage with a given key
export const removeStoredItems = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error(`Error removing ${key} from localStorage:`, error);
  }
};

// Clear all app data from localStorage
export const clearAllStoredData = (): void => {
  try {
    localStorage.removeItem('freezerItems');
    localStorage.removeItem('shoppingItems');
    localStorage.removeItem('mealIdeas');
    localStorage.removeItem('userSettings');
  } catch (error) {
    console.error('Error clearing all data from localStorage:', error);
  }
};
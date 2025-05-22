// This file is now just a barrel file that re-exports everything from the service modules
// This maintains backward compatibility with existing imports

export { supabase, initSupabase } from './services/client';
export { setupAuthListener, handleAuthRedirect, signInWithGoogle, signInWithEmail, signUp, signOut, getCurrentUser } from './services/auth';
export { migrateLocalDataToSupabase } from './services/migration';

export { fetchFreezerItems, addFreezerItem, updateFreezerItem, deleteFreezerItem, subscribeToFreezerItems } from './services/freezer';
export { fetchShoppingItems, addShoppingItem, updateShoppingItem, deleteShoppingItem, subscribeToShoppingItems } from './services/shopping';
export { fetchMealIdeas, generateMealIdeas, updateMealIdea, addMealIdea, deleteMealIdea } from './services/mealIdeas';
export { fetchUserSettings, saveUserSettings } from './services/user';
export { extractBarcodeFromImage, searchOpenFoodFacts, recognizeImageContent, scanBarcode, parseItemTextWithAI } from './services/images';
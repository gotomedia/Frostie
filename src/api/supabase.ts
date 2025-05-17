import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { FreezerItem, ShoppingItem, MealIdea } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Make sure to set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const initSupabase = (): SupabaseClient => {
  return supabase;
};

// ==================== AUTH STATE CHANGE LISTENER ====================

export const setupAuthListener = (
  callback: (session: any | null) => void
) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      console.log("Auth state changed:", event, session ? "Session found" : "No session");
      callback(session);
    }
  );

  // Return the subscription to unsubscribe later
  return subscription;
};

// Function to manually set session from URL parameters
export const handleAuthRedirect = async (): Promise<boolean> => {
  // Check if we have a hash fragment that contains tokens
  if (window.location.hash && window.location.hash.includes('access_token')) {
    try {
      console.log('Auth redirect detected, attempting to set session...');
      
      // Supabase should automatically handle the hash, but we can manually trigger it
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error retrieving session after redirect:', error);
        return false;
      }
      
      if (data.session) {
        console.log('Session successfully established after redirect');
        return true;
      } else {
        console.log('No session found after redirect processing');
      }
    } catch (err) {
      console.error('Error handling auth redirect:', err);
    } finally {
      // Remove hash to clean up the URL regardless of outcome
      window.location.hash = '';
    }
  }
  
  return false;
};

// ==================== FREEZER ITEM FUNCTIONS ====================

export const fetchFreezerItems = async (): Promise<FreezerItem[]> => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user) {
    console.log('No authenticated user, returning empty array');
    return [];
  }
  
  const { data, error } = await supabase
    .from('freezer_items')
    .select('*')
    .eq('user_id', user.user.id)
    .order('expiry_date', { ascending: true });
  
  if (error) {
    console.error('Error fetching freezer items:', error);
    throw error;
  }
  
  console.log('Raw freezer items from DB:', data);
  
  // Transform from DB format to app format
  return data.map(item => ({
    id: item.id,
    name: item.name,
    addedDate: new Date(item.added_date),
    expirationDate: new Date(item.expiry_date),
    category: item.category || 'Other',
    quantity: item.quantity ? Number(item.quantity) : 1,
    size: item.size || '', // Use the size field directly
    tags: item.tags || [],
    notes: item.notes || ''
  }));
};

export const addFreezerItem = async (item: FreezerItem): Promise<FreezerItem> => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user) {
    console.error('No authenticated user');
    throw new Error('User must be authenticated to add items');
  }
  
  console.log('Adding freezer item to Supabase:', item);
  
  // Convert from app format to DB format
  const dbItem = {
    id: item.id || uuidv4(),
    user_id: user.user.id,
    name: item.name,
    quantity: String(item.quantity),
    size: item.size, // Include the size field
    category: item.category,
    expiry_date: item.expirationDate.toISOString(),
    added_date: item.addedDate.toISOString(),
    notes: item.notes,
    tags: item.tags,
    created_at: new Date().toISOString()
  };
  
  console.log('DB item being inserted:', dbItem);
  
  const { data, error } = await supabase
    .from('freezer_items')
    .insert([dbItem])
    .select()
    .single();
  
  if (error) {
    console.error('Error adding freezer item:', error);
    throw error;
  }
  
  console.log('Successfully added freezer item, DB returned:', data);
  
  // Return the item in app format
  return {
    id: data.id,
    name: data.name,
    addedDate: new Date(data.added_date),
    expirationDate: new Date(data.expiry_date),
    category: data.category || 'Other',
    quantity: data.quantity ? Number(data.quantity) : 1,
    size: data.size || '', // Use the size field directly
    tags: data.tags || [],
    notes: data.notes || ''
  };
};

export const updateFreezerItem = async (item: FreezerItem): Promise<FreezerItem> => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user) {
    console.error('No authenticated user');
    throw new Error('User must be authenticated to update items');
  }
  
  console.log('Updating freezer item in Supabase:', item);
  
  // Convert from app format to DB format
  const dbItem = {
    name: item.name,
    quantity: String(item.quantity),
    size: item.size, // Include the size field
    category: item.category,
    expiry_date: item.expirationDate.toISOString(),
    notes: item.notes,
    tags: item.tags
  };
  
  console.log('DB item being updated:', dbItem);
  
  const { data, error } = await supabase
    .from('freezer_items')
    .update(dbItem)
    .eq('id', item.id)
    .eq('user_id', user.user.id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating freezer item:', error);
    throw error;
  }
  
  console.log('Successfully updated freezer item, DB returned:', data);
  
  // Return the updated item in app format
  return {
    id: data.id,
    name: data.name,
    addedDate: new Date(data.added_date),
    expirationDate: new Date(data.expiry_date),
    category: data.category || 'Other',
    quantity: data.quantity ? Number(data.quantity) : 1,
    size: data.size || '', // Use the size field directly
    tags: data.tags || [],
    notes: data.notes || ''
  };
};

export const deleteFreezerItem = async (id: string): Promise<void> => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user) {
    console.error('No authenticated user');
    throw new Error('User must be authenticated to delete items');
  }
  
  const { error } = await supabase
    .from('freezer_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.user.id);
  
  if (error) {
    console.error('Error deleting freezer item:', error);
    throw error;
  }
};

// ==================== SHOPPING ITEM FUNCTIONS ====================

export const fetchShoppingItems = async (): Promise<ShoppingItem[]> => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user) {
    console.log('No authenticated user, returning empty array');
    return [];
  }
  
  const { data, error } = await supabase
    .from('shopping_items')
    .select('*')
    .eq('user_id', user.user.id)
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching shopping items:', error);
    throw error;
  }
  
  // Transform from DB format to app format
  return data.map(item => ({
    id: item.id,
    name: item.name,
    completed: item.completed,
    category: item.category || 'Other'
  }));
};

export const addShoppingItem = async (item: ShoppingItem): Promise<ShoppingItem> => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user) {
    console.error('No authenticated user');
    throw new Error('User must be authenticated to add items');
  }
  
  // Convert from app format to DB format
  const dbItem = {
    id: item.id || uuidv4(),
    user_id: user.user.id,
    name: item.name,
    quantity: item.quantity || '1',
    completed: item.completed || false,
    category: item.category || 'Other'
  };
  
  const { data, error } = await supabase
    .from('shopping_items')
    .insert([dbItem])
    .select()
    .single();
  
  if (error) {
    console.error('Error adding shopping item:', error);
    throw error;
  }
  
  // Return the item in app format
  return {
    id: data.id,
    name: data.name,
    completed: data.completed,
    category: data.category || 'Other'
  };
};

export const updateShoppingItem = async (item: ShoppingItem): Promise<ShoppingItem> => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user) {
    console.error('No authenticated user');
    throw new Error('User must be authenticated to update items');
  }
  
  // Convert from app format to DB format
  const dbItem = {
    name: item.name,
    quantity: item.quantity || '1',
    completed: item.completed,
    category: item.category || 'Other'
  };
  
  const { data, error } = await supabase
    .from('shopping_items')
    .update(dbItem)
    .eq('id', item.id)
    .eq('user_id', user.user.id)
    .select()
    .single();
  
  if (error) {
    console.error('Error updating shopping item:', error);
    throw error;
  }
  
  // Return the updated item in app format
  return {
    id: data.id,
    name: data.name,
    completed: data.completed,
    category: data.category || 'Other'
  };
};

export const deleteShoppingItem = async (id: string): Promise<void> => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user) {
    console.error('No authenticated user');
    throw new Error('User must be authenticated to delete items');
  }
  
  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.user.id);
  
  if (error) {
    console.error('Error deleting shopping item:', error);
    throw error;
  }
};

// ==================== MEAL IDEA FUNCTIONS ====================

export const fetchMealIdeas = async (): Promise<MealIdea[]> => {
  const { data, error } = await supabase
    .from('meal_ideas')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching meal ideas:', error);
    throw error;
  }
  
  // Transform from DB format to app format
  return data.map(idea => ({
    id: idea.id,
    title: idea.title,
    description: idea.description,
    imageUrl: idea.image_url,
    ingredients: idea.ingredients,
    matchedItems: [], // This will be populated client-side
    vegetarian: idea.vegetarian || false,
    vegan: idea.vegan || false,
    glutenFree: idea.gluten_free || false,
    dairyFree: idea.dairy_free || false
  }));
};

export const generateMealIdeas = async (freezerItems: FreezerItem[]): Promise<MealIdea[]> => {
  // Check if we have a valid API endpoint to call
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const apiEndpoint = `${supabaseUrl}/functions/v1/generate-meal-ideas`;
  
  try {
    // If we have a valid endpoint, make the API call
    if (apiEndpoint) {
      // Get user's dietary preferences if available
      let dietaryPreferences = {
        vegetarian: false,
        vegan: false,
        glutenFree: false,
        dairyFree: false
      };
      
      try {
        const { data: user } = await supabase.auth.getUser();
        if (user?.user) {
          const { data: settings } = await supabase
            .from('user_settings')
            .select('dietary')
            .eq('user_id', user.user.id)
            .single();
          
          if (settings?.dietary) {
            dietaryPreferences = settings.dietary;
          }
        }
      } catch (error) {
        console.error('Error fetching dietary preferences:', error);
      }

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          freezerItems: freezerItems.map(item => item.name),
          apiKey: geminiApiKey,
          dietaryPreferences
        })
      });
      
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.error('Error generating meal ideas:', error);
  }
  
  // If API call fails or we don't have a valid endpoint, use mock data
  console.log('Using mock meal ideas data');
  
  // Mock response for now
  const mockIdeas: MealIdea[] = [
    {
      id: Date.now().toString(),
      title: 'Chicken Stir Fry',
      description: 'Quick and easy stir fry with frozen vegetables and chicken.',
      ingredients: ['Chicken', 'Vegetables', 'Soy Sauce'],
      imageUrl: 'https://images.pexels.com/photos/2347311/pexels-photo-2347311.jpeg',
      matchedItems: freezerItems
        .filter(item => 
          item.name.toLowerCase().includes('chicken') || 
          item.name.toLowerCase().includes('vegetable')
        ).map(item => item.name),
      vegetarian: false,
      vegan: false,
      glutenFree: true,
      dairyFree: true
    },
    {
      id: (Date.now() + 1).toString(),
      title: 'Homemade Pizza',
      description: 'Use that frozen dough to make a delicious homemade pizza.',
      ingredients: ['Pizza Dough', 'Sauce', 'Cheese', 'Toppings'],
      imageUrl: 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg',
      matchedItems: freezerItems
        .filter(item => 
          item.name.toLowerCase().includes('pizza') || 
          item.name.toLowerCase().includes('dough')
        ).map(item => item.name),
      vegetarian: true,
      vegan: false,
      glutenFree: false,
      dairyFree: false
    }
  ];
  
  return mockIdeas;
};

// ==================== IMAGE AND BARCODE SCANNING FUNCTIONS ====================

// Extract barcode from image using Gemini AI
export const extractBarcodeFromImage = async (imageFile: File): Promise<string | null> => {
  // Check if we have a valid API endpoint to call
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const apiEndpoint = `${supabaseUrl}/functions/v1/extract-barcode`;
  
  try {
    if (apiEndpoint) {
      // Create form data to send the image
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('apiKey', geminiApiKey || '');
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.barcode) {
        console.log('Barcode detected:', data.barcode);
        return data.barcode;
      }
    }
  } catch (error) {
    console.error('Error extracting barcode from image:', error);
  }
  
  return null;
};

// Search Open Food Facts database for product information
export const searchOpenFoodFacts = async (barcode: string): Promise<string | null> => {
  try {
    const openFoodFactsUrl = `https://world.openfoodfacts.net/api/v2/product/${barcode}.json`;
    
    const response = await fetch(openFoodFactsUrl);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Product with barcode ${barcode} not found in Open Food Facts`);
        return null;
      }
      throw new Error(`Open Food Facts API call failed with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 1 && data.product) {
      // Extract product name and add relevant details 
      const productBrand = data.product.brands || '';
      const productName = data.product.product_name || '';
      const quantity = data.product.quantity || '';
      
      // Format the product information
      let formattedProductInfo = '';
      if (productBrand && productName) {
        formattedProductInfo = `${productBrand} ${productName}`;
      } else if (productName) {
        formattedProductInfo = productName;
      } else if (productBrand) {
        formattedProductInfo = productBrand;
      } else {
        formattedProductInfo = `Unknown Product (${barcode})`;
      }
      
      // Add quantity if available
      if (quantity) {
        formattedProductInfo += ` ${quantity}`;
      }
      
      console.log('Found product:', formattedProductInfo);
      return formattedProductInfo;
    }
  } catch (error) {
    console.error('Error searching Open Food Facts:', error);
  }
  
  return null;
};

export const recognizeImageContent = async (imageFile: File): Promise<string> => {
  // Check if we have a valid API endpoint to call
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const apiEndpoint = `${supabaseUrl}/functions/v1/recognize-image`;
  
  try {
    // First, try to extract barcode from the image
    const barcode = await extractBarcodeFromImage(imageFile);
    
    // If a barcode is detected, try to look up the product
    if (barcode) {
      const productName = await searchOpenFoodFacts(barcode);
      if (productName) {
        return productName;
      }
      // If product lookup fails, fall back to generic barcode result
      return `Scanned Item ${barcode} #other`;
    }
    
    // No barcode detected or product lookup failed, proceed with regular image recognition
    // If we have a valid endpoint, make the API call
    if (apiEndpoint) {
      // Create form data to send the image
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('apiKey', geminiApiKey || '');
      
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.recognizedText;
    }
  } catch (error) {
    console.error('Error recognizing image content:', error);
  }
  
  // If API call fails or we don't have a valid endpoint, use mock data
  console.log('Using mock image recognition data');
  
  // Mock response
  const mockRecognitions = [
    'Frozen Chicken Breast 500g #protein',
    'Ice Cream 1L #dessert',
    'Frozen Pizza 12" #dinner',
    'Frozen Vegetables 250g #healthy',
    'Homemade Soup 500ml #leftovers'
  ];
  
  return mockRecognitions[Math.floor(Math.random() * mockRecognitions.length)];
};

export const scanBarcode = async (barcodeData: string): Promise<string> => {
  // Check if we have a valid API endpoint to call
  const apiEndpoint = `${supabaseUrl}/functions/v1/scan-barcode`;
  
  try {
    // If we have a valid endpoint, make the API call
    if (apiEndpoint) {
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({ barcode: barcodeData })
      });
      
      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.productName;
    }
  } catch (error) {
    console.error('Error scanning barcode:', error);
  }
  
  // If API call fails or we don't have a valid endpoint, use mock data
  console.log('Using mock barcode data');
  
  // Mock response
  return `Scanned Item ${barcodeData.substring(0, 4)}`;
};

// ==================== USER SETTINGS FUNCTIONS ====================

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  expirationDays: number;
  dietary: {
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
    dairyFree: boolean;
  }
}

export const fetchUserSettings = async (): Promise<UserSettings | null> => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user) {
    console.log('No authenticated user, checking localStorage');
    // Check if we have settings in localStorage
    const storedSettings = localStorage.getItem('userSettings');
    return storedSettings ? JSON.parse(storedSettings) : null;
  }
  
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.user.id)
      .single();
    
    if (error) {
      console.error('Error fetching user settings:', error);
      // Fall back to localStorage
      const storedSettings = localStorage.getItem('userSettings');
      return storedSettings ? JSON.parse(storedSettings) : null;
    }
    
    if (!data) {
      // No settings in Supabase, check localStorage
      const storedSettings = localStorage.getItem('userSettings');
      if (storedSettings) {
        // If we have settings in localStorage, save them to Supabase
        const settings = JSON.parse(storedSettings);
        await saveUserSettings(settings);
        return settings;
      }
      return null;
    }
    
    // Transform from DB format to app format
    return {
      theme: data.theme as 'light' | 'dark' | 'system',
      notifications: data.notifications,
      expirationDays: data.expiration_days,
      dietary: {
        vegetarian: data.dietary?.vegetarian || false,
        vegan: data.dietary?.vegan || false,
        glutenFree: data.dietary?.glutenFree || false,
        dairyFree: data.dietary?.dairyFree || false
      }
    };
  } catch (error) {
    console.error('Error in fetchUserSettings:', error);
    const storedSettings = localStorage.getItem('userSettings');
    return storedSettings ? JSON.parse(storedSettings) : null;
  }
};

export const saveUserSettings = async (settings: UserSettings): Promise<void> => {
  const { data: user } = await supabase.auth.getUser();
  
  // Always save to localStorage for both guests and authenticated users
  localStorage.setItem('userSettings', JSON.stringify(settings));
  
  if (!user?.user) {
    console.log('No authenticated user, settings saved to localStorage only');
    return;
  }
  
  try {
    // Check if settings already exist for this user
    const { data: existingSettings, error: fetchError } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', user.user.id)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      // Handle error, but skip "not found" error as that's expected if no settings exist
      console.error('Error checking existing settings:', fetchError);
      return;
    }
    
    // Convert from app format to DB format
    const dbSettings = {
      user_id: user.user.id,
      theme: settings.theme,
      notifications: settings.notifications,
      expiration_days: settings.expirationDays,
      dietary: settings.dietary,
      updated_at: new Date().toISOString()
    };
    
    if (existingSettings) {
      // Update existing settings
      console.log(`Updating existing settings for user ${user.user.id}`);
      const { error: updateError } = await supabase
        .from('user_settings')
        .update(dbSettings)
        .eq('user_id', user.user.id);
      
      if (updateError) {
        console.error('Error updating user settings:', updateError);
      }
    } else {
      // Insert new settings
      console.log(`Creating new settings for user ${user.user.id}`);
      const { error: insertError } = await supabase
        .from('user_settings')
        .insert([{
          ...dbSettings,
          created_at: new Date().toISOString()
        }]);
      
      if (insertError) {
        console.error('Error inserting user settings:', insertError);
        
        // If we get a duplicate key error, try updating instead
        if (insertError.code === '23505') { // PostgreSQL unique violation code
          console.log('Duplicate key detected, trying update instead');
          const { error: fallbackError } = await supabase
            .from('user_settings')
            .update(dbSettings)
            .eq('user_id', user.user.id);
          
          if (fallbackError) {
            console.error('Error in fallback update of user settings:', fallbackError);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in saveUserSettings:', error);
  }
};

// ==================== AUTHENTICATION FUNCTIONS ====================

export const signInWithGoogle = async (): Promise<void> => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    }
  });
  
  if (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export const signInWithEmail = async (email: string, password: string): Promise<void> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    console.error('Error signing in with email:', error);
    throw error;
  }
  
  // After successful sign-in, migrate local data
  await migrateLocalDataToSupabase();
};

export const signUp = async (email: string, password: string): Promise<void> => {
  console.log(`Attempting to sign up with email: ${email}`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
    }
  });
  
  if (error) {
    console.error('Error signing up:', error);
    throw error;
  }

  console.log('Sign up result:', data);
  
  // In Supabase, signUp doesn't automatically sign in the user if email confirmation is required
  if (data.session) {
    console.log('Session created, user is signed in');
    // After successful sign-up with immediate session, migrate local data
    await migrateLocalDataToSupabase();
  } else if (data.user) {
    console.log('User created but needs email confirmation');
    // User needs to confirm email
  }
};

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Error signing out:', error);
    throw error;
  }

  localStorage.removeItem('dataAlreadyMigrated');
  
  // Force reload the page to reset all app state
  window.location.href = '/';
};

export const getCurrentUser = async (): Promise<{ id: string; email: string } | null> => {
  const { data, error } = await supabase.auth.getUser();
  
  if (error || !data.user) {
    return null;
  }
  
  return {
    id: data.user.id,
    email: data.user.email || ''
  };
};

// ==================== DATA MIGRATION FUNCTION ====================

// Helper function to check if string is a valid UUID
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

export const migrateLocalDataToSupabase = async (): Promise<void> => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user) {
    console.error('No authenticated user for migration');
    return;
  }
  
  console.log('Migrating local data to Supabase...');
  
  // Get local data
  const freezerItems = JSON.parse(localStorage.getItem('freezerItems') || '[]');
  const shoppingItems = JSON.parse(localStorage.getItem('shoppingItems') || '[]');
  const userSettings = JSON.parse(localStorage.getItem('userSettings') || 'null');
  
  try {
    // Migrate freezer items
    if (freezerItems.length > 0) {
      const dbFreezerItems = freezerItems.map((item: FreezerItem) => ({
        // Generate a new UUID if the id is not a valid UUID (likely a timestamp)
        id: isValidUUID(item.id) ? item.id : uuidv4(),
        user_id: user.user.id,
        name: item.name,
        quantity: String(item.quantity),
        size: item.size || '', // Include the size field
        category: item.category || 'Other',
        expiry_date: item.expirationDate,
        added_date: item.addedDate,
        notes: item.notes || '',
        tags: item.tags || [],
        created_at: new Date().toISOString()
      }));
      
      const { error: freezerError } = await supabase
        .from('freezer_items')
        .insert(dbFreezerItems);
      
      if (freezerError) {
        console.error('Error migrating freezer items:', freezerError);
      } else {
        console.log(`Successfully migrated ${dbFreezerItems.length} freezer items`);
      }
    }
    
    // Migrate shopping items
    if (shoppingItems.length > 0) {
      const dbShoppingItems = shoppingItems.map((item: ShoppingItem) => ({
        // Generate a new UUID if the id is not a valid UUID (likely a timestamp)
        id: isValidUUID(item.id) ? item.id : uuidv4(),
        user_id: user.user.id,
        name: item.name,
        quantity: item.quantity || '1',
        completed: item.completed || false,
        category: item.category || 'Other',
        created_at: new Date().toISOString()
      }));
      
      const { error: shoppingError } = await supabase
        .from('shopping_items')
        .insert(dbShoppingItems);
      
      if (shoppingError) {
        console.error('Error migrating shopping items:', shoppingError);
      } else {
        console.log(`Successfully migrated ${dbShoppingItems.length} shopping items`);
      }
    }
    
    // Migrate user settings
    if (userSettings) {
      // Get existing settings first
      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.user.id)
        .single();
      
      const dbSettings = {
        user_id: user.user.id,
        theme: userSettings.theme || 'system',
        notifications: userSettings.notifications !== undefined ? userSettings.notifications : true,
        expiration_days: userSettings.expirationDays || 30,
        dietary: userSettings.dietary || {
          vegetarian: false,
          vegan: false,
          glutenFree: false,
          dairyFree: false
        },
        updated_at: new Date().toISOString()
      };
      
      if (existingSettings) {
        // Update existing settings
        const { error: updateError } = await supabase
          .from('user_settings')
          .update(dbSettings)
          .eq('user_id', user.user.id);
        
        if (updateError) {
          console.error('Error updating user settings during migration:', updateError);
        } else {
          console.log('Successfully updated user settings');
        }
      } else {
        // Insert new settings
        const { error: settingsError } = await supabase
          .from('user_settings')
          .insert([{
            ...dbSettings,
            created_at: new Date().toISOString()
          }]);
        
        if (settingsError) {
          console.error('Error migrating user settings:', settingsError);
          
          // If duplicate key, try update instead
          if (settingsError.code === '23505') {
            const { error: fallbackError } = await supabase
              .from('user_settings')
              .update(dbSettings)
              .eq('user_id', user.user.id);
            
            if (fallbackError) {
              console.error('Error in fallback update during migration:', fallbackError);
            } else {
              console.log('Successfully migrated user settings (fallback method)');
            }
          }
        } else {
          console.log('Successfully migrated user settings');
        }
      }
    }
    
    console.log('Data migration completed');
    
    // Mark migration as complete
    localStorage.setItem('dataAlreadyMigrated', 'true');
  } catch (error) {
    console.error('Error during data migration:', error);
  }
};

// ==================== REAL-TIME SUBSCRIPTION FUNCTIONS ====================

export const subscribeToFreezerItems = (
  onInsert: (item: FreezerItem) => void,
  onUpdate: (item: FreezerItem) => void,
  onDelete: (id: string) => void
) => {
  const { data: user } = supabase.auth.getUser();
  
  if (!user) {
    console.log('No authenticated user for real-time subscription');
    return null;
  }
  
  return supabase
    .channel('freezer-items-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'freezer_items'
      },
      (payload) => {
        const newItem = payload.new as any;
        // Only process if this is for the current user
        if (newItem.user_id === user.user?.id) {
          onInsert({
            id: newItem.id,
            name: newItem.name,
            addedDate: new Date(newItem.added_date),
            expirationDate: new Date(newItem.expiry_date),
            category: newItem.category || 'Other',
            quantity: newItem.quantity ? Number(newItem.quantity) : 1,
            size: newItem.size || '',  // Use the size field directly
            tags: newItem.tags || [],
            notes: newItem.notes || ''
          });
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'freezer_items'
      },
      (payload) => {
        const updatedItem = payload.new as any;
        // Only process if this is for the current user
        if (updatedItem.user_id === user.user?.id) {
          onUpdate({
            id: updatedItem.id,
            name: updatedItem.name,
            addedDate: new Date(updatedItem.added_date),
            expirationDate: new Date(updatedItem.expiry_date),
            category: updatedItem.category || 'Other',
            quantity: updatedItem.quantity ? Number(updatedItem.quantity) : 1,
            size: updatedItem.size || '',  // Use the size field directly
            tags: updatedItem.tags || [],
            notes: updatedItem.notes || ''
          });
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'freezer_items'
      },
      (payload) => {
        // Only process if this is for the current user
        if (payload.old.user_id === user.user?.id) {
          onDelete(payload.old.id);
        }
      }
    )
    .subscribe();
};

export const subscribeToShoppingItems = (
  onInsert: (item: ShoppingItem) => void,
  onUpdate: (item: ShoppingItem) => void,
  onDelete: (id: string) => void
) => {
  const { data: user } = supabase.auth.getUser();
  
  if (!user) {
    console.log('No authenticated user for real-time subscription');
    return null;
  }
  
  return supabase
    .channel('shopping-items-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'shopping_items'
      },
      (payload) => {
        const newItem = payload.new as any;
        // Only process if this is for the current user
        if (newItem.user_id === user.user?.id) {
          onInsert({
            id: newItem.id,
            name: newItem.name,
            completed: newItem.completed,
            category: newItem.category || 'Other'
          });
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'shopping_items'
      },
      (payload) => {
        const updatedItem = payload.new as any;
        // Only process if this is for the current user
        if (updatedItem.user_id === user.user?.id) {
          onUpdate({
            id: updatedItem.id,
            name: updatedItem.name,
            completed: updatedItem.completed,
            category: updatedItem.category || 'Other'
          });
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'shopping_items'
      },
      (payload) => {
        // Only process if this is for the current user
        if (payload.old.user_id === user.user?.id) {
          onDelete(payload.old.id);
        }
      }
    )
    .subscribe();
};

// Function to parse food item text with AI
export const parseItemTextWithAI = async (text: string): Promise<any> => {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/parse-item-text-with-ai`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`
      },
      body: JSON.stringify({ inputText: text })
    });
    
    if (!response.ok) {
      throw new Error(`API call failed with status: ${response.status}`);
    }
    
    return response.json();
  } catch (error) {
    console.error('Error parsing text with AI:', error);
    throw error;
  }
};
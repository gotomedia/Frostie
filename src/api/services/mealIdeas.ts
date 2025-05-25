import { v4 as uuidv4 } from 'uuid';
import { supabase } from './client';
import { FreezerItem, MealIdea } from '../../types';
import { logger } from "@/lib/logger";

export const fetchMealIdeas = async (): Promise<MealIdea[]> => {
  const { data, error } = await supabase
    .from('meal_ideas')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    logger.error('Error fetching meal ideas:', error);
    throw error;
  }
  
  logger.debug('Raw meal ideas data from Supabase:', data);
  
  // Transform from DB format to app format
  return data.map(idea => ({
    id: idea.id,
    title: idea.title,
    description: idea.description,
    imageUrl: idea.image_url,
    ingredients: idea.ingredients,
    matchedItems: [], // This will be populated client-side in IdeasPage
    vegetarian: idea.vegetarian || false,
    vegan: idea.vegan || false,
    glutenFree: idea.gluten_free || false,
    dairyFree: idea.dairy_free || false,
    favorite: idea.favorite || false,
    cookingTime: idea.cooking_time || '30 minutes',
    user_id: idea.user_id
  }));
};

export const generateMealIdeas = async (
  freezerItems: FreezerItem[], 
  dietaryPreferences?: {
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
    dairyFree: boolean;
  }
): Promise<MealIdea[]> => {
  // Check if we have a valid API endpoint to call
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const apiEndpoint = `${supabase.supabaseUrl}/functions/v1/generate-meal-ideas`;
  
  // Add detailed logs to check each critical variable
  logger.debug('🔑 Gemini API key status:', geminiApiKey ? 'Available' : 'Not available');
  logger.debug('🔗 Supabase URL used for meal ideas generation:', supabase.supabaseUrl);
  logger.debug('🔑 Checking supabaseKey:', supabase.supabaseKey ? 'Present' : 'Missing');
  logger.debug('🥗 Dietary preferences for generation:', dietaryPreferences);
  
  // Add log to show freezer items being used
  logger.debug('🍗 Freezer items being sent to generate meal ideas:', 
    freezerItems.map(item => item.name));
  logger.debug('📊 Total freezer items count:', freezerItems.length);
  
  try {
    // If we have a valid endpoint, make the API call
    if (apiEndpoint) {
      logger.debug('🚀 Attempting to call edge function at:', apiEndpoint);
      
      // Get user's dietary preferences if not provided
      let preferences = dietaryPreferences;
      
      if (!preferences) {
        logger.debug('⚠️ No dietary preferences provided, fetching from user settings...');
        try {
          const { data: user } = await supabase.auth.getUser();
          if (user?.user) {
            const { data: settings } = await supabase
              .from('user_settings')
              .select('dietary')
              .eq('user_id', user.user.id)
              .single();
            
            if (settings?.dietary) {
              preferences = settings.dietary;
              logger.debug('👤 Using user dietary preferences from DB:', preferences);
            } else {
              logger.debug('⚠️ No user dietary preferences found in DB, using defaults');
              preferences = {
                vegetarian: false,
                vegan: false,
                glutenFree: false,
                dairyFree: false
              };
            }
          } else {
            logger.debug('👤 No authenticated user for dietary preferences');
            preferences = {
              vegetarian: false,
              vegan: false,
              glutenFree: false,
              dairyFree: false
            };
          }
        } catch (error) {
          logger.error('Error fetching dietary preferences:', error);
          preferences = {
            vegetarian: false,
            vegan: false,
            glutenFree: false,
            dairyFree: false
          };
        }
      }

      logger.debug('📡 Making API request with headers:', {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabase.supabaseKey ? '****' : 'MISSING'}`
      });
      
      logger.debug('📦 Request body:', JSON.stringify({
        freezerItems: freezerItems.map(item => item.name),
        apiKey: geminiApiKey ? '****' : 'MISSING',
        dietaryPreferences: preferences
      }));

      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify({
          freezerItems: freezerItems.map(item => item.name),
          apiKey: geminiApiKey,
          dietaryPreferences: preferences
        })
      });
      
      logger.debug('🔄 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('❌ API call failed with status:', response.status, errorText);
        throw new Error(`API call failed with status: ${response.status}`);
      }
      
      logger.debug('✅ API call successful, parsing response');
      const data = await response.json();
      logger.debug('📋 Generated meal ideas:', data.length);
      
      // Process the data to add matched items
      const processedIdeas = data.map((idea: MealIdea) => {
        // For each idea, find which freezer items match the ingredients
        const matchedItems = freezerItems
          .filter(item => {
            // Check if any ingredient contains this freezer item name
            const itemName = item.name.toLowerCase();
            return idea.ingredients.some(ingredient => 
              ingredient.toLowerCase().includes(itemName) || 
              itemName.includes(ingredient.toLowerCase())
            );
          })
          .map(item => item.name);
        
        logger.debug(`Idea "${idea.title}" matched with: ${matchedItems.join(', ') || 'none'}`);
        
        return {
          ...idea,
          matchedItems
        };
      });
      
      return processedIdeas;
    } else {
      logger.debug('⚠️ No valid API endpoint available, supabaseUrl is:', supabase.supabaseUrl);
    }
  } catch (error) {
    logger.error('Error generating meal ideas:', error);
    logger.error('Error details:', error instanceof Error ? error.message : String(error));
    logger.error('Error stack:', error instanceof Error && error.stack ? error.stack : 'No stack available');
  }
  
  // If API call fails or we don't have a valid endpoint, use mock data
  logger.debug('🔄 Using mock meal ideas data');
  
  // Mock response for now
  const mockIdeas: MealIdea[] = [
    {
      id: uuidv4(),
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
      dairyFree: true,
      favorite: false,
      cookingTime: '30 minutes'
    },
    {
      id: uuidv4(),
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
      dairyFree: false,
      favorite: false,
      cookingTime: '45 minutes'
    }
  ];
  
  logger.debug('🔄 Returning mock ideas with matched items:', 
    mockIdeas.map(idea => ({
      title: idea.title,
      matchedItems: idea.matchedItems
    }))
  );
  
  return mockIdeas;
};

// Function to ensure we don't exceed 9 meal ideas, preserving favorites
const limitMealIdeas = async (userId: string): Promise<void> => {
  try {
    logger.debug('🔢 Checking meal idea count limit (max: 9)');
    
    // Get all meal ideas for this user
    const { data: allIdeas, error } = await supabase
      .from('meal_ideas')
      .select('id, favorite, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }); // Get oldest first
    
    if (error) {
      logger.error('Error fetching meal ideas for limit check:', error);
      return;
    }
    
    logger.debug(`📊 Current meal idea count: ${allIdeas.length}`);
    
    if (allIdeas.length <= 9) {
      logger.debug('✅ Count is within limit, no cleanup needed');
      return;
    }
    
    // Separate favorites from non-favorites
    const favoriteIdeas = allIdeas.filter(idea => idea.favorite);
    const nonFavoriteIdeas = allIdeas.filter(idea => !idea.favorite);
    
    logger.debug(`⭐ Favorite ideas: ${favoriteIdeas.length}`);
    logger.debug(`🔶 Non-favorite ideas: ${nonFavoriteIdeas.length}`);
    
    // Calculate how many non-favorites to keep
    const maxNonFavoritesToKeep = 9 - favoriteIdeas.length;
    
    if (maxNonFavoritesToKeep <= 0) {
      logger.debug('⚠️ All slots taken by favorites, no room for non-favorites');
      return;
    }
    
    if (nonFavoriteIdeas.length <= maxNonFavoritesToKeep) {
      logger.debug('✅ Non-favorite count is within limit, no cleanup needed');
      return;
    }
    
    // Determine which non-favorites to delete (oldest first)
    const nonFavoritesToDelete = nonFavoriteIdeas
      .slice(0, nonFavoriteIdeas.length - maxNonFavoritesToKeep)
      .map(idea => idea.id);
    
    logger.debug(`🗑️ Deleting ${nonFavoritesToDelete.length} oldest non-favorite ideas`);
    
    if (nonFavoritesToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('meal_ideas')
        .delete()
        .in('id', nonFavoritesToDelete);
      
      if (deleteError) {
        logger.error('Error deleting excess meal ideas:', deleteError);
      } else {
        logger.debug('✅ Successfully deleted excess meal ideas');
      }
    }
  } catch (error) {
    logger.error('Error in limitMealIdeas:', error);
  }
};

export const updateMealIdea = async (idea: MealIdea): Promise<MealIdea> => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user) {
    logger.error('No authenticated user');
    throw new Error('User must be authenticated to update meal ideas');
  }
  
  // Convert from app format to DB format
  const dbItem = {
    title: idea.title,
    description: idea.description,
    image_url: idea.imageUrl,
    ingredients: idea.ingredients,
    vegetarian: idea.vegetarian || false,
    vegan: idea.vegan || false,
    gluten_free: idea.glutenFree || false,
    dairy_free: idea.dairyFree || false,
    favorite: idea.favorite || false,
    cooking_time: idea.cookingTime || '30 minutes'
  };
  
  const { data, error } = await supabase
    .from('meal_ideas')
    .update(dbItem)
    .eq('id', idea.id)
    .select()
    .single();
  
  if (error) {
    logger.error('Error updating meal idea:', error);
    throw error;
  }
  
  // Return the updated idea in app format
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    imageUrl: data.image_url,
    ingredients: data.ingredients,
    matchedItems: idea.matchedItems || [], // Preserve existing matched items
    vegetarian: data.vegetarian || false,
    vegan: data.vegan || false,
    glutenFree: data.gluten_free || false,
    dairyFree: data.dairy_free || false,
    favorite: data.favorite || false,
    cookingTime: data.cooking_time || '30 minutes'
  };
};

export const addMealIdea = async (idea: MealIdea): Promise<MealIdea> => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user) {
    logger.error('No authenticated user');
    throw new Error('User must be authenticated to add meal ideas');
  }
  
  // Ensure the idea has a valid UUID before sending to Supabase
  const ideaId = idea.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idea.id) 
    ? idea.id 
    : uuidv4();
  
  // Convert from app format to DB format
  const dbItem = {
    id: ideaId,
    user_id: user.user.id,
    title: idea.title,
    description: idea.description,
    image_url: idea.imageUrl,
    ingredients: idea.ingredients,
    vegetarian: idea.vegetarian || false,
    vegan: idea.vegan || false,
    gluten_free: idea.glutenFree || false,
    dairy_free: idea.dairyFree || false,
    favorite: idea.favorite || false,
    cooking_time: idea.cookingTime || '30 minutes',
    created_at: new Date().toISOString()
  };
  
  logger.debug('📝 Adding meal idea to Supabase:', {
    title: idea.title,
    user_id: user.user.id,
    ingredients: idea.ingredients.length,
    matchedItems: idea.matchedItems ? idea.matchedItems.length : 0
  });
  
  const { data, error } = await supabase
    .from('meal_ideas')
    .insert([dbItem])
    .select()
    .single();
  
  if (error) {
    logger.error('Error adding meal idea:', error);
    logger.error('Error code:', error.code);
    logger.error('Error message:', error.message);
    logger.error('Error details:', error.details);
    throw error;
  }
  
  logger.debug('✅ Successfully added meal idea to Supabase:', data.title);
  
  // After adding a meal idea, ensure we're not exceeding the limit of 9 ideas
  await limitMealIdeas(user.user.id);
  
  // Return the item in app format
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    imageUrl: data.image_url,
    ingredients: data.ingredients,
    matchedItems: idea.matchedItems || [], // Preserve the matched items
    vegetarian: data.vegetarian || false,
    vegan: data.vegan || false,
    glutenFree: data.gluten_free || false,
    dairyFree: data.dairy_free || false,
    favorite: data.favorite || false,
    cookingTime: data.cooking_time || '30 minutes'
  };
};

export const deleteMealIdea = async (id: string): Promise<void> => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user) {
    logger.error('No authenticated user');
    throw new Error('User must be authenticated to delete meal ideas');
  }
  
  const { error } = await supabase
    .from('meal_ideas')
    .delete()
    .eq('id', id)
    .eq('user_id', user.user.id);
  
  if (error) {
    logger.error('Error deleting meal idea:', error);
    throw error;
  }
};
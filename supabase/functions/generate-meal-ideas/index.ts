// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

interface ImageSearchResult {
  imageUrl: string;
  source: string;
  relevanceScore: number;
}

// Cache to store image URLs to avoid duplicate API calls
const imageCache = new Map<string, ImageSearchResult>();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { freezerItems, dietaryPreferences } = await req.json();
    
    // Default dietary preferences if none provided
    const preferences = dietaryPreferences || {
      vegetarian: false,
      vegan: false,
      glutenFree: false,
      dairyFree: false
    };
    
    if (!freezerItems || !Array.isArray(freezerItems) || freezerItems.length === 0) {
      return new Response(
        JSON.stringify({ error: "No freezer items provided" }),
        { 
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
    
    // Get API keys from Deno environment variables
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    const pexelsApiKey = Deno.env.get("PEXELS_API_KEY");
    const unsplashApiKey = Deno.env.get("UNSPLASH_API_KEY");
    
    // Use mock data if no API key available
    if (!geminiApiKey) {
      console.log("No Gemini API key provided, using mock meal ideas");
      const mockIdeas = await getMockMealIdeas(freezerItems, preferences, pexelsApiKey, unsplashApiKey);
      return new Response(
        JSON.stringify(mockIdeas),
        { 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
    
    // Initialize the Gemini API client
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Create the prompt for Gemini
    const prompt = `
      Generate 3 meal ideas based on these ingredients from my freezer: ${freezerItems.join(", ")}.
      
      Take into account the following dietary preferences:
      - Vegetarian: ${preferences.vegetarian}
      - Vegan: ${preferences.vegan}
      - Gluten-Free: ${preferences.glutenFree}
      - Dairy-Free: ${preferences.dairyFree}
      
      For each meal, provide:
      1. A clear title
      2. A short description (1-2 sentences)
      3. A list of ingredients
      4. Which of my freezer items it uses
      5. Whether it is vegetarian, vegan, gluten-free, and dairy-free (true/false)
      
      Format the response as a JSON array with this structure:
      [
        {
          "id": "1",
          "title": "Meal Title",
          "description": "Description of the meal",
          "ingredients": ["Ingredient 1", "Ingredient 2"],
          "matchedItems": ["freezer item 1", "freezer item 2"],
          "vegetarian": true,
          "vegan": false,
          "glutenFree": true,
          "dairyFree": false
        }
      ]
    `;

    // Generate the response
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Parse the JSON from the response
    try {
      const jsonStartIndex = text.indexOf('[');
      const jsonEndIndex = text.lastIndexOf(']') + 1;
      const jsonText = text.substring(jsonStartIndex, jsonEndIndex);
      const mealIdeas = JSON.parse(jsonText);
      
      // Add generated IDs
      const idPrefix = Date.now().toString();
      
      // Process each meal idea to find an image
      const mealIdeasWithImages = await Promise.all(
        mealIdeas.map(async (idea: any, index: number) => {
          idea.id = `${idPrefix}-${index}`;
          
          // Find an image for the meal
          const imageResult = await findImageForMeal(
            idea.title, 
            idea.ingredients, 
            pexelsApiKey, 
            unsplashApiKey
          );
          
          // Add the image URL to the meal idea
          idea.imageUrl = imageResult.imageUrl;
          
          return idea;
        })
      );
      
      return new Response(
        JSON.stringify(mealIdeasWithImages),
        { 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    } catch (error) {
      console.error("Error parsing JSON response:", error);
      const mockIdeas = await getMockMealIdeas(freezerItems, preferences, pexelsApiKey, unsplashApiKey);
      return new Response(
        JSON.stringify(mockIdeas),
        { 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders
        }
      }
    );
  }
});

// Function to search for an image using the prioritized workflow
async function findImageForMeal(
  mealName: string, 
  ingredients: string[], 
  pexelsApiKey: string | null, 
  unsplashApiKey: string | null
): Promise<ImageSearchResult> {
  // Check cache first
  const cacheKey = mealName.toLowerCase().trim();
  if (imageCache.has(cacheKey)) {
    console.log(`Using cached image for "${mealName}"`);
    return imageCache.get(cacheKey)!;
  }
  
  const defaultResult = {
    imageUrl: "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg",
    source: "default",
    relevanceScore: 0
  };
  
  try {
    // Step 1: Try Pexels API with meal name
    if (pexelsApiKey) {
      const pexelsResult = await searchPexels(
        `${mealName} food`, 
        pexelsApiKey
      );
      
      if (pexelsResult && pexelsResult.relevanceScore >= 80) {
        // Cache the result
        imageCache.set(cacheKey, pexelsResult);
        return pexelsResult;
      }
      
      // Step 2: Try Pexels API with main ingredients
      if (ingredients && ingredients.length > 0) {
        const mainIngredients = ingredients.slice(0, 3).join(" ");
        const pexelsIngredientsResult = await searchPexels(
          `${mainIngredients} food`, 
          pexelsApiKey
        );
        
        if (pexelsIngredientsResult && pexelsIngredientsResult.relevanceScore >= 80) {
          // Cache the result
          imageCache.set(cacheKey, pexelsIngredientsResult);
          return pexelsIngredientsResult;
        }
      }
    }
    
    // Step 3: Try Unsplash API with meal name
    if (unsplashApiKey) {
      const unsplashResult = await searchUnsplash(
        `${mealName} food`, 
        unsplashApiKey
      );
      
      if (unsplashResult && unsplashResult.relevanceScore >= 80) {
        // Cache the result
        imageCache.set(cacheKey, unsplashResult);
        return unsplashResult;
      }
      
      // Step 4: Try Unsplash API with main ingredients
      if (ingredients && ingredients.length > 0) {
        const mainIngredients = ingredients.slice(0, 3).join(" ");
        const unsplashIngredientsResult = await searchUnsplash(
          `${mainIngredients} food`, 
          unsplashApiKey
        );
        
        if (unsplashIngredientsResult && unsplashIngredientsResult.relevanceScore >= 80) {
          // Cache the result
          imageCache.set(cacheKey, unsplashIngredientsResult);
          return unsplashIngredientsResult;
        }
      }
    }
    
    // Step 5: Fall back to a default selection of food images
    const foodImages = [
      "https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg",
      "https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg",
      "https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg",
      "https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg",
      "https://images.pexels.com/photos/1640768/pexels-photo-1640768.jpeg",
      "https://images.pexels.com/photos/1099680/pexels-photo-1099680.jpeg",
      "https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg"
    ];
    
    const fallbackResult = {
      imageUrl: foodImages[Math.floor(Math.random() * foodImages.length)],
      source: "fallback",
      relevanceScore: 50
    };
    
    // Cache the fallback result to avoid repeated API calls
    imageCache.set(cacheKey, fallbackResult);
    return fallbackResult;
  } catch (error) {
    console.error(`Error finding image for meal "${mealName}":`, error);
    return defaultResult;
  }
}

// Function to search images from Pexels
async function searchPexels(query: string, apiKey: string): Promise<ImageSearchResult | null> {
  try {
    const response = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape`, {
      headers: {
        "Authorization": apiKey
      }
    });
    
    if (!response.ok) {
      throw new Error(`Pexels API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.photos && data.photos.length > 0) {
      // Filter images by quality criteria
      const qualityPhotos = data.photos.filter((photo: any) => {
        // Minimum resolution check
        return photo.width >= 800 && photo.height >= 600;
      });
      
      if (qualityPhotos.length > 0) {
        // Choose a random high-quality image
        const randomIndex = Math.floor(Math.random() * Math.min(3, qualityPhotos.length));
        const selectedPhoto = qualityPhotos[randomIndex];
        
        // Calculate relevance score (mock implementation)
        // In a real app, this would use more sophisticated image analysis
        const relevanceScore = Math.min(100, 75 + Math.random() * 25);
        
        return {
          imageUrl: selectedPhoto.src.large,
          source: "pexels",
          relevanceScore
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error searching Pexels:", error);
    return null;
  }
}

// Function to search images from Unsplash
async function searchUnsplash(query: string, apiKey: string): Promise<ImageSearchResult | null> {
  try {
    const response = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=10&orientation=landscape`, {
      headers: {
        "Authorization": `Client-ID ${apiKey}`
      }
    });
    
    if (!response.ok) {
      throw new Error(`Unsplash API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      // Filter images by quality criteria
      const qualityPhotos = data.results.filter((photo: any) => {
        // Minimum resolution check
        return photo.width >= 800 && photo.height >= 600;
      });
      
      if (qualityPhotos.length > 0) {
        // Choose a random high-quality image
        const randomIndex = Math.floor(Math.random() * Math.min(3, qualityPhotos.length));
        const selectedPhoto = qualityPhotos[randomIndex];
        
        // Calculate relevance score (mock implementation)
        const relevanceScore = Math.min(100, 75 + Math.random() * 25);
        
        return {
          imageUrl: selectedPhoto.urls.regular,
          source: "unsplash",
          relevanceScore
        };
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error searching Unsplash:", error);
    return null;
  }
}

// Function to generate mock meal ideas with image search
async function getMockMealIdeas(
  freezerItems: string[], 
  preferences: any = {}, 
  pexelsApiKey: string | null, 
  unsplashApiKey: string | null
) {
  const timestamp = Date.now().toString();
  
  // Base mock data
  const mockMeals = [
    {
      id: `${timestamp}-1`,
      title: "Chicken Stir Fry",
      description: "Quick and easy stir fry with frozen vegetables and chicken.",
      ingredients: ["Chicken", "Mixed Vegetables", "Soy Sauce", "Garlic", "Ginger"],
      matchedItems: freezerItems.filter(item => 
        item.toLowerCase().includes("chicken") || 
        item.toLowerCase().includes("vegetable")
      ),
      vegetarian: false,
      vegan: false,
      glutenFree: true,
      dairyFree: true
    },
    {
      id: `${timestamp}-2`,
      title: "Homemade Pizza",
      description: "Use that frozen dough to make a delicious homemade pizza with your favorite toppings.",
      ingredients: ["Pizza Dough", "Tomato Sauce", "Cheese", "Your Favorite Toppings"],
      matchedItems: freezerItems.filter(item => 
        item.toLowerCase().includes("pizza") || 
        item.toLowerCase().includes("dough")
      ),
      vegetarian: true,
      vegan: false,
      glutenFree: false,
      dairyFree: false
    },
    {
      id: `${timestamp}-3`,
      title: "Berry Smoothie Bowl",
      description: "A refreshing and nutritious breakfast using frozen berries.",
      ingredients: ["Frozen Mixed Berries", "Banana", "Yogurt", "Honey", "Granola"],
      matchedItems: freezerItems.filter(item => 
        item.toLowerCase().includes("berry") || 
        item.toLowerCase().includes("fruit")
      ),
      vegetarian: true,
      vegan: false,
      glutenFree: true,
      dairyFree: false
    },
    {
      id: `${timestamp}-4`,
      title: "Vegetable Curry",
      description: "A hearty vegetable curry using frozen vegetables and chickpeas.",
      ingredients: ["Frozen Mixed Vegetables", "Chickpeas", "Coconut Milk", "Curry Paste", "Rice"],
      matchedItems: freezerItems.filter(item => 
        item.toLowerCase().includes("vegetable") || 
        item.toLowerCase().includes("peas")
      ),
      vegetarian: true,
      vegan: true,
      glutenFree: true,
      dairyFree: true
    },
    {
      id: `${timestamp}-5`,
      title: "Fish Tacos",
      description: "Crispy fish tacos with fresh slaw and avocado.",
      ingredients: ["Frozen Fish Fillets", "Cabbage", "Lime", "Avocado", "Corn Tortillas"],
      matchedItems: freezerItems.filter(item => 
        item.toLowerCase().includes("fish") || 
        item.toLowerCase().includes("seafood")
      ),
      vegetarian: false,
      vegan: false,
      glutenFree: true,
      dairyFree: true
    }
  ];
  
  // Filter based on dietary preferences if any are specified
  let filteredMeals = [...mockMeals];
  
  if (preferences.vegetarian) {
    filteredMeals = filteredMeals.filter(meal => meal.vegetarian);
  }
  
  if (preferences.vegan) {
    filteredMeals = filteredMeals.filter(meal => meal.vegan);
  }
  
  if (preferences.glutenFree) {
    filteredMeals = filteredMeals.filter(meal => meal.glutenFree);
  }
  
  if (preferences.dairyFree) {
    filteredMeals = filteredMeals.filter(meal => meal.dairyFree);
  }
  
  // If no meals match the dietary preferences, return a subset of the original meals
  if (filteredMeals.length === 0) {
    filteredMeals = mockMeals.slice(0, 3);
  }
  
  // Limit to 3 meals and add images
  const mealsToReturn = filteredMeals.slice(0, 3);
  
  // Add images to each meal
  const mealsWithImages = await Promise.all(
    mealsToReturn.map(async meal => {
      // Try to find an appropriate image
      const imageResult = await findImageForMeal(
        meal.title, 
        meal.ingredients, 
        pexelsApiKey, 
        unsplashApiKey
      );
      
      return {
        ...meal,
        imageUrl: imageResult.imageUrl
      };
    })
  );
  
  return mealsWithImages;
}
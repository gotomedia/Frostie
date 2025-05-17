// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { itemName } = await req.json();
    
    if (!itemName || typeof itemName !== 'string') {
      return new Response(
        JSON.stringify({ error: "No item name provided or invalid format" }),
        { 
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
    
    // Get API key from Deno environment variables
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    
    // Use mock data if no API key provided
    if (!apiKey) {
      console.log("No API key provided, using mock tags");
      return new Response(
        JSON.stringify({ tags: getMockTags(itemName) }),
        { 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }
    
    // Initialize the Gemini API client
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // Create the prompt for Gemini
    const prompt = `
      Generate 3 relevant tags for the food item "${itemName}" that would be useful for organizing a freezer inventory.
      
      Tags should be single words that describe:
      - Food category (e.g., protein, dairy, vegetable)
      - Cuisine type (e.g., italian, mexican, asian)
      - Meal type (e.g., breakfast, lunch, dinner, snack)
      - Common uses (e.g., baking, grilling)
      
      Format the response as a JSON array of strings only, with no explanation.
      Example: ["protein", "dinner", "italian"]
    `;

    // Generate the response
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Parse the JSON from the response
    try {
      // Extract the JSON array from the text (in case there's unwanted text)
      const jsonMatch = text.match(/\[.*\]/);
      if (!jsonMatch) {
        throw new Error("No JSON array found in response");
      }
      
      const jsonText = jsonMatch[0];
      const tags = JSON.parse(jsonText);
      
      // Ensure the result is an array of strings
      if (!Array.isArray(tags) || !tags.every(tag => typeof tag === 'string')) {
        throw new Error("Invalid tags format returned");
      }
      
      return new Response(
        JSON.stringify({ tags }),
        { 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    } catch (error) {
      console.error("Error parsing tags response:", error);
      return new Response(
        JSON.stringify({ tags: getMockTags(itemName) }),
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

// Function to generate mock tags if the API call fails
function getMockTags(itemName: string): string[] {
  const name = itemName.toLowerCase();
  const tags: string[] = [];
  
  // Basic food categories
  if (name.includes('chicken') || name.includes('beef') || name.includes('pork') || 
      name.includes('meat') || name.includes('fish') || name.includes('seafood')) {
    tags.push('protein');
  }
  
  if (name.includes('vegetable') || name.includes('broccoli') || 
      name.includes('carrot') || name.includes('spinach')) {
    tags.push('veggie');
  }
  
  if (name.includes('fruit') || name.includes('berry') || 
      name.includes('apple') || name.includes('banana')) {
    tags.push('fruit');
  }
  
  if (name.includes('bread') || name.includes('dough') || name.includes('pastry')) {
    tags.push('bakery');
  }
  
  if (name.includes('milk') || name.includes('cheese') || 
      name.includes('yogurt') || name.includes('cream')) {
    tags.push('dairy');
  }
  
  // Meal types
  if (name.includes('breakfast') || name.includes('pancake') || name.includes('waffle')) {
    tags.push('breakfast');
  } else if (name.includes('lunch') || name.includes('sandwich')) {
    tags.push('lunch');
  } else if (name.includes('dinner') || name.includes('supper')) {
    tags.push('dinner');
  } else {
    // Default tag if no meal type identified
    tags.push('meal');
  }
  
  // Cuisines
  if (name.includes('italian') || name.includes('pasta') || name.includes('pizza')) {
    tags.push('italian');
  } else if (name.includes('mexican') || name.includes('taco') || name.includes('burrito')) {
    tags.push('mexican');
  } else if (name.includes('chinese') || name.includes('asian')) {
    tags.push('asian');
  }
  
  // Preparation
  if (name.includes('leftover') || name.includes('homemade')) {
    tags.push('homemade');
  }
  
  // Ensure we have at least 3 tags
  const defaultTags = ['food', 'freezer', 'meal', 'cooking', 'ingredient', 'prep'];
  while (tags.length < 3) {
    const randomTag = defaultTags[Math.floor(Math.random() * defaultTags.length)];
    if (!tags.includes(randomTag)) {
      tags.push(randomTag);
    }
  }
  
  // Return only the first 3 tags
  return tags.slice(0, 3);
}
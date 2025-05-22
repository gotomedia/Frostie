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
    const { inputText, defaultExpirationDays = 30 } = await req.json();
    
    if (!inputText || typeof inputText !== 'string') {
      return new Response(
        JSON.stringify({ error: "No input text provided or invalid format" }),
        { 
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    }

    // Log important values for debugging
    console.log(`Processing input text: "${inputText}", defaultExpirationDays: ${defaultExpirationDays}`);

    // Get the API key from the environment
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    
    // Use fallback parsing if no API key is available
    if (!apiKey) {
      console.log("No Gemini API key available, using fallback parser");
      return new Response(
        JSON.stringify({ 
          parsedDetails: fallbackParser(inputText, defaultExpirationDays),
          source: "fallback" 
        }),
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

    // Create the prompt for Gemini with improved date handling instructions
    const prompt = `
      You are a food item parser for a freezer inventory app called Frostie.
      
      Given the following text describing a food item, extract the following information:
      
      - name: The name of the food item (use proper capitalization and pluralize if quantity > 1)
      - quantity: The number of units of the food item (default to 1 if not specified)
      - category: The category of the food item (must be one of: Meat & Poultry, Seafood, Fruits & Vegetables, Prepared Meals, Ready-to-Eat, Bakery & Bread, Dairy & Alternatives, Soups & Broths, Herbs & Seasonings, Other)
      - size: The size or weight of the food item (e.g., "1 lb", "500g")
      - expirationDate: The expiration date of the food item in ISO format (YYYY-MM-DD).
        - If a specific date is given, use that date
        - If a relative period is mentioned (like "expires in 2 weeks" or "good for 3 days"), calculate the date by adding that period to TODAY'S date. TODAY is ${new Date().toISOString().split('T')[0]}.
        - If no explicit expiration is mentioned, set to null so we can use FoodKeeper database for accurate lookup
      - tags: A list of 2-3 relevant tags for the food item (e.g., protein, dinner, breakfast, homemade, italian)
      
      Text: "${inputText}"
      
      Return only a JSON object with these properties, no other text. Here's the exact format:
      {
        "name": string,
        "quantity": number,
        "category": string,
        "size": string,
        "expirationDate": string (ISO date format YYYY-MM-DD) or null,
        "tags": string[]
      }
    `;

    // Generate the response
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    console.log("Gemini response:", text);
    
    try {
      // Find the JSON object in the response text
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No valid JSON found in response");
      }
      
      const jsonStr = jsonMatch[0];
      const parsedData = JSON.parse(jsonStr);
      
      console.log("Parsed data from Gemini:", parsedData);
      
      // Get today's date for reference
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // STEP 1: Check if AI provided a valid, future expiration date
      let expirationDate = null;
      let expirationSource = "default"; // Track where the expiration date came from
      
      if (isValidDateString(parsedData.expirationDate)) {
        const aiProvidedDate = new Date(parsedData.expirationDate);
        
        // Ensure the AI-provided date is in the future
        if (aiProvidedDate > today) {
          expirationDate = aiProvidedDate;
          expirationSource = "ai";
          console.log("Using AI-provided future date:", expirationDate.toISOString());
        } else {
          console.warn("AI returned a date in the past:", parsedData.expirationDate);
          // We'll check FoodKeeper next
        }
      }
      
      // STEP 2: If AI didn't provide a valid future date, check FoodKeeper
      if (!expirationDate) {
        console.log(`🔍 FoodKeeper lookup: Looking up "${parsedData.name}" in category "${parsedData.category}"`);
        const foodkeeperExpDate = getFoodkeeperExpirationDate(
          parsedData.name,
          parsedData.category,
          defaultExpirationDays
        );
        
        // Check if FoodKeeper provided a different date than the default
        const defaultDate = new Date(today);
        defaultDate.setDate(defaultDate.getDate() + defaultExpirationDays);
        const daysFromNow = Math.round((foodkeeperExpDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (foodkeeperExpDate.getTime() !== defaultDate.getTime()) {
          // FoodKeeper gave us a specific date, use it
          expirationDate = foodkeeperExpDate;
          expirationSource = "foodkeeper";
          console.log(`✅ SUCCESS: FoodKeeper match found for "${parsedData.name}": ${foodkeeperExpDate.toISOString().split('T')[0]} (${daysFromNow} days)`);
        } else {
          // STEP 3: If no specific FoodKeeper data, use default days
          expirationDate = defaultDate;
          expirationSource = "default";
          console.log(`❌ FoodKeeper match not found for "${parsedData.name}"`);
          console.log(`Using default: ${defaultExpirationDays} days (explicitly passed in request)`);
        }
      }
      
      // Convert to ISO format with only the date part (YYYY-MM-DD)
      const isoDateStr = expirationDate.toISOString().split('T')[0];
      
      const validatedData = {
        name: parsedData.name || "",
        quantity: typeof parsedData.quantity === 'number' ? parsedData.quantity : 1,
        category: isValidCategory(parsedData.category) ? parsedData.category : "Other",
        size: parsedData.size || "",
        expirationDate: isoDateStr,
        tags: Array.isArray(parsedData.tags) ? parsedData.tags.map(t => String(t)) : []
      };
      
      console.log("Validated data:", validatedData, "Expiration source:", expirationSource);
      
      return new Response(
        JSON.stringify({ parsedDetails: validatedData, source: "gemini" }),
        { 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders
          }
        }
      );
    } catch (error) {
      console.error("Error parsing Gemini response:", error);
      // Fall back to the simple parser if something goes wrong
      return new Response(
        JSON.stringify({ 
          parsedDetails: fallbackParser(inputText, defaultExpirationDays),
          source: "fallback" 
        }),
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
    const inputText = "";
    const defaultExpirationDays = 30;
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        parsedDetails: fallbackParser(inputText || "", defaultExpirationDays),
        source: "fallback" 
      }),
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

// Helper function to check if a category is valid
function isValidCategory(category: string): boolean {
  const validCategories = [
    'Meat & Poultry',
    'Seafood',
    'Fruits & Vegetables',
    'Prepared Meals',
    'Ready-to-Eat',
    'Bakery & Bread',
    'Dairy & Alternatives',
    'Soups & Broths',
    'Herbs & Seasonings',
    'Other'
  ];
  
  return validCategories.includes(category);
}

// Helper function to check if a string is a valid date
function isValidDateString(dateString: string): boolean {
  if (!dateString) return false;
  
  // Try to parse the date 
  const date = new Date(dateString);
  const valid = !isNaN(date.getTime());
  
  console.log(`Date string '${dateString}' is ${valid ? 'valid' : 'invalid'}`);
  return valid;
}

// Improved fallback parser to use when Gemini API is not available
function fallbackParser(input: string, defaultExpirationDays: number = 30): any {
  console.log("Using fallback parser for input:", input);
  console.log("Using default expiration days:", defaultExpirationDays);
  
  // Initialize default values
  let name = input.trim();
  let quantity = 1;
  let category = 'Other';
  let size = '';
  let tags: string[] = [];
  
  // Today's date - make sure hours/minutes/seconds are zeroed out for consistent date handling
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Initialize expirationDate as null to track if we found an explicit date
  let expirationDate: Date | null = null;
  let expirationSource = "default"; // Track source of expiration date
  let explicitExpirationFound = false;
  
  console.log("Initial defaulted expiration date not set, will check for explicit date first");

  // Extract tags (words with # prefix)
  const tagRegex = /#(\w+)/g;
  let tagMatch;
  
  while ((tagMatch = tagRegex.exec(name)) !== null) {
    tags.push(tagMatch[1]);
  }
  
  // Remove the tags from the name
  name = name.replace(/#\w+/g, '').trim();

  // Extract expiration dates with improved patterns
  const datePatterns = [
    // MM/DD/YYYY or DD/MM/YYYY format
    { regex: /expire[s]?:?\s?(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i, group: 1, type: 'date' },
    // "expires in X days/weeks/months"
    { regex: /expire[s]?\s+in\s+(\d+)\s+(day|days|week|weeks|month|months)/i, group: [1, 2], type: 'period' },
    // "good for X days/weeks/months"
    { regex: /good\s+for\s+(\d+)\s+(day|days|week|weeks|month|months)/i, group: [1, 2], type: 'period' },
    // "for X days/weeks/months"
    { regex: /for\s+(\d+)\s+(day|days|week|weeks|month|months)/i, group: [1, 2], type: 'period' },
    // "in X days/weeks/months" - Using word boundaries
    { regex: /\bin\s+(\d+)\s+(day|days|week|weeks|month|months)\b/i, group: [1, 2], type: 'period' }
  ];

  console.log("Checking date patterns in:", name);
  
  // STEP 1: Check for explicit expiration date in text
  for (const pattern of datePatterns) {
    const match = name.match(pattern.regex);
    if (match) {
      console.log("Matched date pattern:", match[0]);
      
      // Store the original name for comparison
      const nameBeforeReplacement = name;
      
      // Perform the replacement
      name = name.replace(match[0], '').trim();
      
      console.log("Name after replacement:", name);
      
      if (pattern.type === 'date') {
        try {
          const dateStr = match[pattern.group as number];
          const parsedDate = new Date(dateStr);
          if (!isNaN(parsedDate.getTime())) {
            // Check if the date is in the future
            if (parsedDate > today) {
              expirationDate = parsedDate;
              expirationSource = "explicit";
              explicitExpirationFound = true;
              console.log("Set exact date:", expirationDate.toISOString());
            } else {
              console.log("Date is in the past, will try FoodKeeper next");
            }
          }
        } catch (e) {
          console.error("Couldn't parse date", e);
        }
      } else if (pattern.type === 'period') {
        // Handle period format (e.g., "3 days", "2 weeks")
        const groups = pattern.group as number[];
        let amount = match[groups[0]];
        const unit = match[groups[1]];
        
        console.log("Parsed period:", amount, unit);
        
        // Convert word numbers to numeric
        const wordToNumber: { [key: string]: number } = {
          'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
          'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
        };
        
        if (isNaN(Number(amount)) && wordToNumber[amount.toLowerCase()] !== undefined) {
          amount = String(wordToNumber[amount.toLowerCase()]);
          console.log("Converted word number to numeric:", amount);
        }
        
        const numAmount = parseInt(amount, 10);
        
        if (!isNaN(numAmount)) {
          // Set expiration date based on today's date
          expirationDate = new Date(today);
          
          switch (unit.toLowerCase()) {
            case 'day':
            case 'days':
              expirationDate.setDate(today.getDate() + numAmount);
              break;
            case 'week':
            case 'weeks':
              expirationDate.setDate(today.getDate() + (numAmount * 7));
              break;
            case 'month':
            case 'months':
              expirationDate.setMonth(today.getMonth() + numAmount);
              break;
          }
          
          expirationSource = "explicit";
          explicitExpirationFound = true;
          console.log("Calculated relative date:", expirationDate.toISOString());
        }
      }
      
      break;
    }
  }

  // Extract size with proper regex
  const sizeRegex = /(\d+\s*(?:lb|lbs|pound|pounds|g|gram|grams|kg|kilogram|kilograms|oz|ounce|ounces|fl oz|ml|milliliter|milliliters))/i;
  const sizeMatch = name.match(sizeRegex);
  if (sizeMatch) {
    size = sizeMatch[1].trim();
    name = name.replace(sizeMatch[0], '').trim();
  }

  // Handle "X of Y" patterns after size extraction
  const ofMatch = name.match(/^(\d+)\s+of\s+/i);
  if (ofMatch) {
    quantity = parseInt(ofMatch[1], 10);
    name = name.replace(ofMatch[0], '').trim();
  } else {
    // Try to extract quantity from the beginning of the string
    const quantityRegex = /^(\d+)\s+/;
    const quantityMatch = name.match(quantityRegex);
    if (quantityMatch) {
      quantity = parseInt(quantityMatch[1], 10);
      name = name.replace(quantityMatch[0], '').trim();
    }
  }

  // Remove "of" from the beginning of the name if still present
  if (name.toLowerCase().startsWith('of ')) {
    name = name.substring(3).trim();
  }

  // Guess category based on common food types
  category = guessCategory(name);

  // STEP 2: Check FoodKeeper database if no explicit date or if explicit date is in the past
  if (!explicitExpirationFound || expirationSource === "default") {
    console.log(`🔍 FoodKeeper lookup: Looking for "${name}" in category "${category}"`);
    console.log(`Using passed defaultExpirationDays: ${defaultExpirationDays}`);
    const foodkeeperExpDate = getFoodkeeperExpirationDate(name, category, defaultExpirationDays);
    
    // Check if FoodKeeper gave us a date different from the default
    const defaultDate = new Date(today);
    defaultDate.setDate(today.getDate() + defaultExpirationDays);
    const daysFromNow = Math.round((foodkeeperExpDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (foodkeeperExpDate.getTime() !== defaultDate.getTime()) {
      expirationDate = foodkeeperExpDate;
      expirationSource = "foodkeeper";
      console.log(`✅ SUCCESS: FoodKeeper match found for "${name}": ${foodkeeperExpDate.toISOString().split('T')[0]} (${daysFromNow} days)`);
    } else {
      console.log(`❌ FoodKeeper match not found for "${name}"`);
      console.log(`Using default expiration of ${defaultExpirationDays} days`);
      expirationDate = defaultDate;
      expirationSource = "default";
    }
  }

  // STEP 3: If no specific date found, use the default
  if (!expirationDate) {
    console.log("Using default expiration of", defaultExpirationDays, "days");
    expirationDate = new Date(today);
    expirationDate.setDate(today.getDate() + defaultExpirationDays);
    expirationSource = "default";
  }

  // If no tags were extracted, suggest some based on the category
  if (tags.length === 0) {
    tags = suggestBasicTags(name, category);
  }

  // Convert to ISO date string
  const isoDateStr = expirationDate.toISOString().split('T')[0];
  
  console.log("Final parsed result:", {
    name,
    quantity,
    category,
    size,
    expirationDate: isoDateStr,
    tags,
    source: expirationSource
  });

  return {
    name,
    quantity,
    category,
    size,
    expirationDate: isoDateStr,
    tags
  };
}

// Simple category guessing based on keywords
function guessCategory(itemName: string): string {
  const lowerCaseName = itemName.toLowerCase();
  
  if (lowerCaseName.includes('meat') || lowerCaseName.includes('chicken') || 
      lowerCaseName.includes('beef') || lowerCaseName.includes('pork') || 
      lowerCaseName.includes('turkey') || lowerCaseName.includes('lamb')) {
    return 'Meat & Poultry';
  } 
  
  if (lowerCaseName.includes('fish') || lowerCaseName.includes('shrimp') || 
      lowerCaseName.includes('seafood') || lowerCaseName.includes('salmon')) {
    return 'Seafood';
  } 
  
  if (lowerCaseName.includes('vegetable') || lowerCaseName.includes('veg') || 
      lowerCaseName.includes('fruit') || lowerCaseName.includes('berr')) {
    return 'Fruits & Vegetables';
  } 
  
  if (lowerCaseName.includes('leftover') || lowerCaseName.includes('meal prep')) {
    return 'Prepared Meals';
  } 
  
  if (lowerCaseName.includes('dinner') || lowerCaseName.includes('pizza') || 
      lowerCaseName.includes('breakfast')) {
    return 'Ready-to-Eat';
  } 
  
  if (lowerCaseName.includes('bread') || lowerCaseName.includes('dough') || 
      lowerCaseName.includes('pastry')) {
    return 'Bakery & Bread';
  } 
  
  if (lowerCaseName.includes('ice cream') || lowerCaseName.includes('butter') || 
      lowerCaseName.includes('cheese') || lowerCaseName.includes('milk')) {
    return 'Dairy & Alternatives';
  } 
  
  if (lowerCaseName.includes('soup') || lowerCaseName.includes('broth') || 
      lowerCaseName.includes('stock')) {
    return 'Soups & Broths';
  } 
  
  if (lowerCaseName.includes('herb') || lowerCaseName.includes('spice') || 
      lowerCaseName.includes('season')) {
    return 'Herbs & Seasonings';
  }
  
  return 'Other';
}

// Suggest basic tags based on item name and category
function suggestBasicTags(name: string, category: string): string[] {
  const tags: string[] = [];
  const lowerName = name.toLowerCase();
  
  // Add category-based tag
  switch(category) {
    case 'Meat & Poultry':
      tags.push('protein');
      break;
    case 'Seafood':
      tags.push('protein');
      tags.push('seafood');
      break;
    case 'Fruits & Vegetables':
      if (lowerName.includes('fruit') || 
          lowerName.includes('berry') || 
          lowerName.includes('apple')) {
        tags.push('fruit');
      } else {
        tags.push('veggie');
      }
      tags.push('healthy');
      break;
    case 'Prepared Meals':
      tags.push('meal');
      tags.push('ready');
      break;
    case 'Bakery & Bread':
      tags.push('bakery');
      break;
    case 'Dairy & Alternatives':
      tags.push('dairy');
      break;
  }
  
  // Add meal type tags
  if (lowerName.includes('breakfast')) tags.push('breakfast');
  if (lowerName.includes('lunch')) tags.push('lunch');
  if (lowerName.includes('dinner')) tags.push('dinner');
  if (lowerName.includes('dessert') || lowerName.includes('ice cream')) tags.push('dessert');
  
  // Ensure we have at least two tags
  if (tags.length < 2) {
    tags.push('freezer');
  }
  
  return tags.slice(0, 3); // Limit to 3 tags
}

// Implementation of FoodKeeper lookups without importing the actual module
// This is a simplified version just for the edge function
function getFoodkeeperExpirationDate(
  itemName: string,
  category: string = 'Other',
  defaultDays: number = 30
): Date {
  console.log(`🔍 FoodKeeper detailed lookup for "${itemName}" (${category}), defaultDays: ${defaultDays}`);
  
  // Map of common foods to expiration times (in days)
  const simpleFoodkeeperData: Record<string, number> = {
    // Meat & Poultry
    'chicken': 270, // 9 months
    'beef': 240,    // 8 months
    'turkey': 360,  // 12 months
    'pork': 180,    // 6 months
    
    // Seafood
    'fish': 180,    // 6 months
    'shrimp': 180,  // 6 months
    'salmon': 90,   // 3 months
    
    // Fruits & Vegetables
    'vegetables': 300, // 10 months
    'fruit': 300,      // 10 months
    'berries': 240,    // 8 months
    
    // Prepared
    'soup': 60,        // 2 months
    'stew': 90,        // 3 months
    'leftovers': 60,   // 2 months
    
    // Bakery
    'bread': 90,       // 3 months
    'dough': 60,       // 2 months
    
    // Dairy
    'ice cream': 180,  // 6 months
    'butter': 180,     // 6 months
    'cheese': 180      // 6 months
  };
  
  // Look for matches in the data
  const lowerName = itemName.toLowerCase();
  let bestMatchDays = null;
  let bestMatchFood = null;
  
  for (const [food, days] of Object.entries(simpleFoodkeeperData)) {
    if (lowerName.includes(food)) {
      console.log(`✓ FoodKeeper match: "${food}" with ${days} days for "${itemName}"`);
      bestMatchDays = days;
      bestMatchFood = food;
      break;
    }
  }
  
  // If no match found in the simple data, use the default days
  if (bestMatchDays === null) {
    console.log(`❌ FoodKeeper match not found for "${itemName}"`);
    // Special handling for categories when no specific match
    let categoryDays = null;
    switch(category) {
      case 'Meat & Poultry':
        categoryDays = 240; // 8 months
        break;
      case 'Seafood':
        categoryDays = 180; // 6 months
        break;
      case 'Fruits & Vegetables':
        categoryDays = 300; // 10 months
        break;
      case 'Prepared Meals':
        categoryDays = 60;  // 2 months
        break;
      default:
        categoryDays = defaultDays;
    }
    
    if (categoryDays !== defaultDays) {
      console.log(`✓ FoodKeeper category match: "${category}" with ${categoryDays} days for "${itemName}"`);
      bestMatchDays = categoryDays;
    } else {
      console.log(`✗ No FoodKeeper category match found for "${itemName}", using default: ${defaultDays} days`);
      bestMatchDays = defaultDays;
    }
  } else {
    console.log(`✅ SUCCESS: FoodKeeper provided specific data for "${itemName}" based on "${bestMatchFood}"`);
    console.log(`✅ FoodKeeper match found for "${itemName}"`);
  }
  
  // Calculate the expiration date
  const date = new Date();
  date.setDate(date.getDate() + bestMatchDays);
  
  console.log(`FoodKeeper expiration result: ${date.toISOString().split('T')[0]} (${bestMatchDays} days from now)`);
  
  return date;
}
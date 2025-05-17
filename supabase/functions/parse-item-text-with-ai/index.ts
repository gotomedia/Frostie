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
        - Default to ${defaultExpirationDays} days from today if not specified.
      - tags: A list of 2-3 relevant tags for the food item (e.g., protein, dinner, breakfast, homemade, italian)
      
      Text: "${inputText}"
      
      Return only a JSON object with these properties, no other text. Here's the exact format:
      {
        "name": string,
        "quantity": number,
        "category": string,
        "size": string,
        "expirationDate": string (ISO date format YYYY-MM-DD),
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
      
      // Validate and fix the response data
      let expirationDate;
      if (isValidDateString(parsedData.expirationDate)) {
        expirationDate = new Date(parsedData.expirationDate);
        
        // Ensure the date is in the future
        if (expirationDate < today) {
          console.warn("AI returned a date in the past:", expirationDate);
          // Default to user's specified days from now
          expirationDate = new Date();
          expirationDate.setDate(expirationDate.getDate() + defaultExpirationDays);
        }
      } else {
        // Default to user's specified days from now
        expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + defaultExpirationDays);
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
      
      console.log("Validated data:", validatedData);
      
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
function fallbackParser(input: string, defaultExpirationDays: number): any {
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
  
  // Default expiration date is user-specified days from today
  let expirationDate = new Date(today);
  expirationDate.setDate(today.getDate() + defaultExpirationDays);

  console.log("Initial defaulted expiration date:", expirationDate.toISOString());

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
              console.log("Set exact date:", expirationDate.toISOString());
            } else {
              console.log("Date is in the past, using default");
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

  // Capitalize the first letter of each word
  if (name.length > 0) {
    name = name.split(' ')
      .map(word => {
        if (word.length === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
  }

  // If no tags were extracted, suggest some based on the category
  if (tags.length === 0) {
    tags = suggestBasicTags(name, category);
  }

  // Convert to ISO date string - using only the date part (YYYY-MM-DD)
  const isoDateStr = expirationDate.toISOString().split('T')[0];
  
  console.log("Final parsed result:", {
    name,
    quantity,
    category,
    size,
    expirationDate: isoDateStr,
    tags
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
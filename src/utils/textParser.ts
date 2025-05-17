import { FreezerItem } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../api/supabase';
import { CATEGORIES, guessCategory as categoriesGuessCategory, CategoryType } from '../data/categories';

// Interface for parsed item details
export interface ParsedItemDetails {
  name: string;
  quantity: number;
  category: string;
  size: string;
  expirationDate: Date;
  tags: string[];
}

// Enable or disable debug logging
const DEBUG = true;

// Helper function for conditional logging
const debugLog = (...args: any[]) => {
  if (DEBUG) {
    console.log(...args);
  }
};

/**
 * Parse text input using Gemini AI if available, with fallback to regex parsing
 */
export const parseItemText = async (input: string, defaultExpirationDays: number = 30): Promise<ParsedItemDetails> => {
  debugLog('Starting advanced text parsing for input:', input);
  debugLog('Using default expiration days:', defaultExpirationDays);

  try {
    // Try to use the Supabase Edge Function with Gemini AI
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseAnonKey) {
      debugLog('Attempting to use AI parser via Edge Function');
      const response = await fetch(`${supabaseUrl}/functions/v1/parse-item-text-with-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({ 
          inputText: input,
          defaultExpirationDays // Pass the default expiration days to the AI parser
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        debugLog('Received AI parsing response:', data);
        
        if (data.parsedDetails) {
          // Convert the ISO date string back to a Date object
          const expirationDate = new Date(data.parsedDetails.expirationDate);
          debugLog('Parsed expiration date:', expirationDate);
          
          // Validate that the date is in the future
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (expirationDate < today) {
            debugLog('WARNING: AI returned a date in the past:', expirationDate);
            // Set default to user's specified days from now
            const defaultDate = new Date();
            defaultDate.setDate(defaultDate.getDate() + defaultExpirationDays);
            
            const result = {
              ...data.parsedDetails,
              expirationDate: defaultDate
            };
            
            debugLog(`Fixed with default date:`, result);
            return result;
          }
          
          const result = {
            ...data.parsedDetails,
            expirationDate
          };
          
          debugLog(`Successfully parsed with ${data.source} parser:`, result);
          return result;
        }
      } else {
        debugLog('Error from AI parser:', await response.text());
      }
    }
  } catch (error) {
    debugLog('Error using AI parser:', error);
    // Continue to fallback parser
  }

  // Fallback to regex-based parsing
  debugLog('Falling back to regex-based parsing');
  return regexParseItemText(input, defaultExpirationDays);
};

/**
 * Fallback regex-based parser for when AI parsing is unavailable
 */
export const regexParseItemText = (input: string, defaultExpirationDays: number = 30): ParsedItemDetails => {
  debugLog('Starting regex text parsing for input:', input);
  debugLog('Using default expiration days:', defaultExpirationDays);
  
  // Initialize default values
  let name = input.trim();
  let quantity = 1;
  let category = 'Other';
  let size = '';
  
  // Initialize date with today at midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Default to user-specified days from today
  let expirationDate = new Date(today);
  expirationDate.setDate(today.getDate() + defaultExpirationDays);
  
  debugLog('Default expiration date set to:', expirationDate.toISOString());
  
  let tags: string[] = [];

  // Extract tags (words with # prefix)
  const tagRegex = /#(\w+)/g;
  let tagMatch;
  
  debugLog('Extracting tags with regex:', tagRegex);
  while ((tagMatch = tagRegex.exec(name)) !== null) {
    debugLog('Found tag:', tagMatch[1]);
    tags.push(tagMatch[1]);
  }
  
  // Remove the tags from the name
  const nameBeforeTagRemoval = name;
  name = name.replace(/#\w+/g, '').trim();
  debugLog('Name after tag removal:', name, 'Original:', nameBeforeTagRemoval);

  // Extract expiration date/timeframe
  // Look for patterns like "expires: 10/15/2023", "exp 3 days", "good for 2 weeks"
  const datePatterns = [
    // MM/DD/YYYY or DD/MM/YYYY format
    { regex: /expire[s]?:?\s?(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i, group: 1, type: 'date' },
    // "expires in X days/weeks/months"
    { regex: /expire[s]?\s+in\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(day|days|week|weeks|month|months)/i, group: [1, 2], type: 'period' },
    // "good for X days/weeks/months"
    { regex: /good\s+for\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(day|days|week|weeks|month|months)/i, group: [1, 2], type: 'period' },
    // "for X days/weeks/months"
    { regex: /for\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(day|days|week|weeks|month|months)/i, group: [1, 2], type: 'period' },
    // "in X days/weeks/months" - Using word boundaries to correctly identify standalone phrase
    { regex: /\bin\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(day|days|week|weeks|month|months)\b/i, group: [1, 2], type: 'period' }
  ];

  debugLog('Checking for expiration date patterns...');
  for (const pattern of datePatterns) {
    const match = name.match(pattern.regex);
    if (match) {
      debugLog('Matched date pattern:', pattern.regex, 'Match:', match);
      // Store the original name for comparison
      const nameBeforeReplacement = name;
      
      // Perform the replacement
      name = name.replace(match[0], '').trim();
      
      debugLog('Name before replacement:', nameBeforeReplacement);
      debugLog('Removed text:', match[0]);
      debugLog('Name after replacement:', name);
      
      // Additional check to verify no partial words remain
      if (name.match(/\bs$/)) {
        debugLog('Potential trailing "s" detected after replacement');
        // Fix words that might have been partially matched
        name = name.replace(/\bs\b/, '');
      }
      
      if (pattern.type === 'date') {
        try {
          const dateStr = match[pattern.group as number];
          const parsedDate = new Date(dateStr);
          debugLog('Parsed date string:', dateStr, 'to date:', parsedDate);
          if (!isNaN(parsedDate.getTime())) {
            // Make sure the date is in the future
            if (parsedDate > today) {
              expirationDate = parsedDate;
              debugLog('Set exact expiration date to:', expirationDate.toISOString());
            } else {
              debugLog('Parsed date is in the past, keeping default:', expirationDate.toISOString());
            }
          }
        } catch (e) {
          debugLog("Couldn't parse date", e);
        }
      } else if (pattern.type === 'period') {
        // Handle period format (e.g., "3 days", "2 weeks")
        const groups = pattern.group as number[];
        let amount = match[groups[0]];
        const unit = match[groups[1]];
        
        debugLog('Parsed period:', amount, unit);
        
        // Convert word numbers to numeric - include both singular and plural forms
        const wordToNumber: { [key: string]: number } = {
          'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
          'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
          'a': 1, 'an': 1, // Handle "a week" or "an hour"
          'day': 1, 'days': null, // These are for the unit, not the quantity
          'week': 1, 'weeks': null,
          'month': 1, 'months': null
        };
        
        if (isNaN(Number(amount)) && wordToNumber[amount.toLowerCase()] !== undefined) {
          amount = String(wordToNumber[amount.toLowerCase()]);
          debugLog('Converted word number to numeric:', amount);
        }
        
        const numAmount = parseInt(amount, 10);
        
        if (!isNaN(numAmount)) {
          // Start fresh with today's date to avoid compounding periods
          expirationDate = new Date(today);
          
          debugLog('Starting with today for relative date:', today.toISOString());
          
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
          
          debugLog('Set relative expiration date to:', expirationDate.toISOString());
        }
      }
      
      // Break after finding the first date pattern
      break;
    }
  }

  // Extract size and quantity
  // Updated regex to correctly handle units with "s" (e.g., "lbs", "grams")
  const sizeRegex = /(\d+\s*(?:lb|lbs|pound|pounds|g|gram|grams|kg|kilogram|kilograms|oz|ounce|ounces|fl oz|ml|milliliter|milliliters))/i;
  
  // First, catch "X of Y" patterns to prevent misinterpretation
  if (name.match(/\d+\s+of\s+/i)) {
    // Don't extract the number as quantity yet, handle it after size extraction
    debugLog('Detected "X of Y" pattern, delaying quantity extraction');
  } else {
    // Try to extract quantity from the beginning of the string
    const quantityRegex = /^(\d+)\s+/;
    debugLog('Checking for quantity pattern at beginning:', quantityRegex);
    const quantityMatch = name.match(quantityRegex);
    if (quantityMatch) {
      debugLog('Matched quantity:', quantityMatch[1]);
      quantity = parseInt(quantityMatch[1], 10);
      const nameBeforeQuantityRemoval = name;
      name = name.replace(quantityMatch[0], '').trim();
      debugLog('Name after quantity removal:', name, 'Original:', nameBeforeQuantityRemoval);
    }
  }

  debugLog('Checking for size pattern...');
  // Check for size pattern
  const sizeMatch = name.match(sizeRegex);
  if (sizeMatch) {
    debugLog('Matched size:', sizeMatch[1]);
    size = sizeMatch[1].trim();
    const nameBeforeSizeRemoval = name;
    name = name.replace(sizeMatch[0], '').trim();
    debugLog('Name after size removal:', name, 'Original:', nameBeforeSizeRemoval);
  }

  // Handle "X of Y" patterns after size extraction
  const ofMatch = name.match(/^(\d+)\s+of\s+/i);
  if (ofMatch) {
    debugLog('Matched "X of Y" pattern:', ofMatch[0]);
    quantity = parseInt(ofMatch[1], 10);
    const nameBeforeOfRemoval = name;
    name = name.replace(ofMatch[0], '').trim();
    debugLog('Name after "of" removal:', name, 'Original:', nameBeforeOfRemoval);
  }

  // Remove "of" from the beginning of the name if still present
  if (name.toLowerCase().startsWith('of ')) {
    debugLog('Removing "of" prefix from name');
    name = name.substring(3).trim();
  }

  // Determine category based on item name
  category = categoriesGuessCategory(name);
  debugLog('Guessed category:', category);

  // Capitalize the first letter of each word in the name
  if (name.length > 0) {
    name = name.split(' ')
      .map(word => {
        if (word.length === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');
    debugLog('Capitalized name:', name);
    
    // Check if name should be plural based on quantity
    if (quantity > 1) {
      // Apply simple pluralization if needed - generic approach
      const lastWord = name.split(' ').pop() || '';
      if (lastWord && !lastWord.endsWith('s')) {
        // Check for special cases
        if (lastWord.endsWith('y')) {
          // Words ending in 'y' (like berry → berries)
          const pluralizedLastWord = lastWord.slice(0, -1) + 'ies';
          name = name.slice(0, -(lastWord.length)) + pluralizedLastWord;
        } else if (
          !lastWord.endsWith('s') && 
          !lastWord.endsWith('sh') && 
          !lastWord.endsWith('ch') && 
          !lastWord.endsWith('x') && 
          !lastWord.endsWith('z')
        ) {
          // Regular words just add 's'
          name = name + 's';
        }
        debugLog('Pluralized name based on quantity:', name);
      }
    }
  }

  // If no tags were extracted, suggest some based on category and name
  if (tags.length === 0) {
    tags = suggestBasicTags(name, category);
    debugLog('Suggested tags:', tags);
  }

  const parsedDetails = {
    name,
    quantity,
    category,
    size,
    expirationDate,
    tags
  };
  
  debugLog('Final parsed item details:', parsedDetails);
  return parsedDetails;
};

/**
 * Create a FreezerItem from input text using AI parsing or fallback method
 */
export const createFreezerItemFromParsedText = async (text: string): Promise<FreezerItem> => {
  debugLog('Creating freezer item from text:', text);
  
  // Get the user's default expiration days setting
  let defaultExpirationDays = 30; // Default fallback value
  
  try {
    // Try to get user settings
    const { data: user } = await supabase.auth.getUser();
    
    if (user?.user) {
      // User is logged in, get their settings
      const { data: settings } = await supabase
        .from('user_settings')
        .select('expiration_days')
        .eq('user_id', user.user.id)
        .single();
      
      if (settings?.expiration_days) {
        defaultExpirationDays = settings.expiration_days;
        debugLog('Using user default expiration days:', defaultExpirationDays);
      } else {
        debugLog('No user expiration_days setting found, using default:', defaultExpirationDays);
      }
    } else {
      // No user logged in, try to get from localStorage
      const storedSettings = localStorage.getItem('userSettings');
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        if (parsedSettings.expirationDays) {
          defaultExpirationDays = parsedSettings.expirationDays;
          debugLog('Using localStorage expirationDays:', defaultExpirationDays);
        }
      }
    }
  } catch (error) {
    debugLog('Error getting user settings, using default expiration days:', error);
  }
  
  try {
    // Wait for the async parsing to complete with the user's expiration days setting
    const parsedDetails = await parseItemText(text, defaultExpirationDays);
    
    // Return a properly formed FreezerItem with the parsed details
    return {
      id: uuidv4(),
      name: parsedDetails.name,
      addedDate: new Date(),
      expirationDate: parsedDetails.expirationDate,
      category: parsedDetails.category,
      quantity: parsedDetails.quantity,
      size: parsedDetails.size,
      tags: parsedDetails.tags,
      notes: ''
    };
  } catch (error) {
    debugLog('Error in async parsing, using fallback parser:', error);
    
    // Use the regex parser as a fallback with the user's expiration days setting
    const fallbackParsed = regexParseItemText(text, defaultExpirationDays);
    
    // Return a FreezerItem with the fallback parsed details
    return {
      id: uuidv4(),
      name: fallbackParsed.name,
      addedDate: new Date(),
      expirationDate: fallbackParsed.expirationDate,
      category: fallbackParsed.category,
      quantity: fallbackParsed.quantity,
      size: fallbackParsed.size,
      tags: fallbackParsed.tags,
      notes: ''
    };
  }
};

/**
 * Suggest basic tags based on item name and category
 */
export const suggestBasicTags = (name: string, category: string): string[] => {
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
          lowerName.includes('apple') || 
          lowerName.includes('banana')) {
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
      if (lowerName.includes('ice cream')) {
        tags.push('dessert');
      } else {
        tags.push('dairy');
      }
      break;
    case 'Soups & Broths':
      tags.push('soup');
      break;
  }
  
  // Add common meal type tags
  if (lowerName.includes('breakfast') || 
      lowerName.includes('pancake') || 
      lowerName.includes('waffle')) {
    tags.push('breakfast');
  }
  
  if (lowerName.includes('lunch') || 
      lowerName.includes('sandwich')) {
    tags.push('lunch');
  }
  
  if (lowerName.includes('dinner') || 
      lowerName.includes('supper')) {
    tags.push('dinner');
  }
  
  if (lowerName.includes('dessert') || 
      lowerName.includes('cake') || 
      lowerName.includes('ice cream') ||
      lowerName.includes('cookie')) {
    tags.push('dessert');
  }
  
  // Add preparation tags
  if (lowerName.includes('leftover') || 
      lowerName.includes('homemade')) {
    tags.push('homemade');
  }
  
  // Add origin/cuisine tags
  if (lowerName.includes('italian') || 
      lowerName.includes('pasta') || 
      lowerName.includes('pizza')) {
    tags.push('italian');
  }
  
  if (lowerName.includes('mexican') || 
      lowerName.includes('taco') || 
      lowerName.includes('burrito')) {
    tags.push('mexican');
  }
  
  if (lowerName.includes('chinese') || 
      lowerName.includes('asian') || 
      lowerName.includes('stir fry')) {
    tags.push('asian');
  }
  
  return tags.slice(0, 3); // Limit to 3 tags maximum
};

/**
 * Function to suggest tags using AI via Supabase Edge Function
 */
export const suggestTagsWithAI = async (itemName: string): Promise<string[]> => {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseAnonKey) {
      const response = await fetch(`${supabaseUrl}/functions/v1/suggest-tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({ itemName })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.tags && Array.isArray(data.tags)) {
          return data.tags;
        }
      }
    }
    
    // Fallback to basic tag suggestion
    return suggestBasicTags(itemName, categoriesGuessCategory(itemName));
  } catch (error) {
    console.error('Error suggesting tags with AI:', error);
    return suggestBasicTags(itemName, categoriesGuessCategory(itemName));
  }
};
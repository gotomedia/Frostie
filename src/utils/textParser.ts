/**
 * Parse text input using Gemini AI if available, with fallback to regex parsing
 */
import { parseItemTextWithAI } from '../api/services/images';
import { foodkeeperData, findBestFoodMatch, getExpirationInfo, calculateExpirationDate as getFoodkeeperExpirationDate } from '../data/foodkeeperData';
import { guessCategory } from '../data/categories';
import { v4 as uuidv4 } from 'uuid';
import { UserSettings } from '../types';

interface ParsedItemDetails {
  name: string;
  quantity: number;
  category: string;
  size: string;
  expirationDate: Date;
  tags: string[];
}

export const parseItemText = async (input: string, userSettings: UserSettings | null): Promise<ParsedItemDetails> => {
  // Always use 30 days as the fallback expiration period
  const defaultExpirationDays = 30;
  
  debugLog('Starting advanced text parsing for input:', input);
  debugLog('Using fixed default expiration days:', defaultExpirationDays);

  try {
    // Try to use the Supabase Edge Function with Gemini AI
    debugLog('Attempting to use AI parser via Edge Function');
    const result = await parseItemTextWithAI(input);
    
    if (result && result.parsedDetails) {
      debugLog('Received AI parsing response:', result);
      
      // Convert the ISO date string back to a Date object
      const expirationDate = new Date(result.parsedDetails.expirationDate);
      debugLog('Parsed expiration date:', expirationDate);
      
      // Validate that the date is in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (expirationDate < today) {
        debugLog('WARNING: AI returned a date in the past:', expirationDate);
        
        // Look up the item in the FoodKeeper database for a better expiration date
        console.log(`🔍 FoodKeeper lookup for ${result.parsedDetails.name} in category ${result.parsedDetails.category}`);
        const foodkeeperExpDate = getFoodkeeperExpirationDate(
          result.parsedDetails.name, 
          result.parsedDetails.category, 
          defaultExpirationDays
        );
        
        console.log(`✅ FoodKeeper result: ${foodkeeperExpDate.toISOString().split('T')[0]} (${Math.round((foodkeeperExpDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} days from now)`);
        debugLog('Using FoodKeeper expiration date instead:', foodkeeperExpDate);
        
        const parsedDetails = {
          ...result.parsedDetails,
          expirationDate: foodkeeperExpDate
        };
        
        debugLog(`Fixed with FoodKeeper date:`, parsedDetails);
        return {
          name: parsedDetails.name || '',
          quantity: Number(parsedDetails.quantity) || 1,
          category: parsedDetails.category || 'Other',
          size: parsedDetails.size || '',
          expirationDate: parsedDetails.expirationDate,
          tags: parsedDetails.tags || []
        };
      }
      
      const parsedDetails = {
        ...result.parsedDetails,
        expirationDate
      };
      
      debugLog(`Successfully parsed with ${result.source} parser:`, parsedDetails);
      return {
        name: parsedDetails.name || '',
        quantity: Number(parsedDetails.quantity) || 1,
        category: parsedDetails.category || 'Other',
        size: parsedDetails.size || '',
        expirationDate: parsedDetails.expirationDate,
        tags: parsedDetails.tags || []
      };
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
  
  // Initialize expirationDate as null to track if we found an explicit date
  let expirationDate: Date | null = null;
  let explicitExpirationFound = false;
  
  debugLog('Default expiration not set yet, will check FoodKeeper first');
  
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
              explicitExpirationFound = true;
              debugLog('Set exact expiration date to:', expirationDate.toISOString());
            } else {
              debugLog('Parsed date is in the past, will try FoodKeeper data next');
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
          'day': 1, 'days': 0, // These are for the unit, not the quantity
          'week': 1, 'weeks': 0,
          'month': 1, 'months': 0
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
          
          explicitExpirationFound = true;
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
  category = guessCategory(name);
  debugLog('Guessed category:', category);

  // IMPORTANT: Always check FoodKeeper database first for expiration date
  // regardless of whether we found an explicit date in the text
  console.log(`🔍 FoodKeeper lookup: Looking for "${name}" in category "${category}"`);
  const foodkeeperExpDate = getFoodkeeperExpirationDate(name, category, defaultExpirationDays);
  
  // Get what would be the default expiration date for comparison
  const defaultExpDate = new Date(today);
  defaultExpDate.setDate(today.getDate() + defaultExpirationDays);
  
  // Check if FoodKeeper actually returned a different date than our default
  const foodkeeperDifferent = foodkeeperExpDate.getTime() !== defaultExpDate.getTime();
  const daysFromNow = Math.round((foodkeeperExpDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  
  // Decision logic for which expiration date to use:
  if (explicitExpirationFound && expirationDate) {
    // If the user explicitly specified an expiration, use that
    console.log(`✅ Using user-specified expiration date: ${expirationDate.toISOString().split('T')[0]} (${Math.round((expirationDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))} days from now)`);
  } else if (foodkeeperDifferent) {
    // If no explicit date but FoodKeeper has specific data, use that
    console.log(`✅ SUCCESS: FoodKeeper provided specific data for "${name}": ${foodkeeperExpDate.toISOString().split('T')[0]} (${daysFromNow} days)`);
    console.log(`✅ FoodKeeper match found for "${name}"`);
    console.log(`Using FoodKeeper expiration date: ${foodkeeperExpDate.toISOString().split('T')[0]} instead of default: ${defaultExpDate.toISOString().split('T')[0]}`);
    expirationDate = foodkeeperExpDate;
  } else {
    // Last resort: use the default expiration days
    console.log(`❌ No specific FoodKeeper data found for "${name}", using default: ${defaultExpirationDays} days`);
    expirationDate = defaultExpDate;
  }

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
    expirationDate: expirationDate!, // Will never be null at this point
    tags
  };
  
  debugLog('Final parsed item details:', parsedDetails);
  return parsedDetails;
};

/**
 * Helper function to log debug messages for text parsing
 */
const debugLog = (...args: any[]) => {
  // Uncomment this line to enable debug logging
  console.log(...args);
};

/**
 * Suggest basic tags based on item name and category
 */
const suggestBasicTags = (name: string, category: string): string[] => {
  const tags: string[] = [];
  const lowerName = name.toLowerCase();
  
  // Add category as a tag
  if (category !== 'Other') {
    tags.push(category.toLowerCase().replace(/[^a-z0-9]/g, ''));
  }
  
  // Add some common tags based on item name
  if (lowerName.includes('chicken') || lowerName.includes('beef') || lowerName.includes('pork')) {
    tags.push('protein');
  }
  if (lowerName.includes('vegetable') || lowerName.includes('fruit')) {
    tags.push('healthy');
  }
  if (lowerName.includes('dinner') || lowerName.includes('meal')) {
    tags.push('meal');
  }
  if (lowerName.includes('leftover')) {
    tags.push('leftovers');
  }
  if (lowerName.includes('dessert') || lowerName.includes('ice cream')) {
    tags.push('dessert');
  }
  
  return tags;
};

/**
 * Create a freezer item from parsed text
 */
export const createFreezerItemFromParsedText = async (
  text: string, 
  imageUrl?: string, 
  userSettings: UserSettings | null = null
): Promise<any> => {
  // Parse the text to extract item details
  const parsedDetails = await parseItemText(text, userSettings);
  
  // Create a new freezer item with the parsed details
  return {
    id: uuidv4(), // Use UUID instead of timestamp to ensure it's compatible with Supabase
    name: parsedDetails.name,
    quantity: parsedDetails.quantity,
    size: parsedDetails.size,
    category: parsedDetails.category,
    expirationDate: parsedDetails.expirationDate,
    addedDate: new Date(),
    notes: '',
    tags: parsedDetails.tags,
    imageUrl: imageUrl || '' // Use provided image URL or empty string
  };
};
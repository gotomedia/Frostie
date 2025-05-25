/**
 * Parse text input using Gemini AI if available, with fallback to regex parsing
 */
import { logger } from "@/lib/logger";

export interface FoodExpirationInfo {
  minMonths: number;
  maxMonths: number;
  category: string;
}

export interface FoodkeeperData {
  [key: string]: FoodExpirationInfo;
}

// The data is structured as a map of food names to expiration information
// Extracted from the USDA FoodKeeper database
export const foodkeeperData: FoodkeeperData = {
  // Meat
  "beef": { 
    minMonths: 4, 
    maxMonths: 12, 
    category: "Meat & Poultry" 
  },
  "ground beef": { 
    minMonths: 3, 
    maxMonths: 4, 
    category: "Meat & Poultry" 
  },
  "steak": { 
    minMonths: 4, 
    maxMonths: 12, 
    category: "Meat & Poultry" 
  },
  "pork": { 
    minMonths: 4, 
    maxMonths: 12, 
    category: "Meat & Poultry" 
  },
  "ground pork": { 
    minMonths: 3, 
    maxMonths: 4, 
    category: "Meat & Poultry" 
  },
  "pork chops": { 
    minMonths: 4, 
    maxMonths: 12, 
    category: "Meat & Poultry" 
  },
  "lamb": { 
    minMonths: 4, 
    maxMonths: 12, 
    category: "Meat & Poultry" 
  },
  "ground lamb": { 
    minMonths: 3, 
    maxMonths: 4, 
    category: "Meat & Poultry" 
  },
  "veal": { 
    minMonths: 4, 
    maxMonths: 12, 
    category: "Meat & Poultry" 
  },
  "bacon": { 
    minMonths: 1, 
    maxMonths: 2, 
    category: "Meat & Poultry" 
  },
  "sausage": { 
    minMonths: 1, 
    maxMonths: 2, 
    category: "Meat & Poultry" 
  },
  "ham": { 
    minMonths: 1, 
    maxMonths: 2, 
    category: "Meat & Poultry" 
  },
  "goat": { 
    minMonths: 4, 
    maxMonths: 12, 
    category: "Meat & Poultry" 
  },
  "bison": { 
    minMonths: 3, 
    maxMonths: 4, 
    category: "Meat & Poultry" 
  },
  "rabbit": { 
    minMonths: 9, 
    maxMonths: 9, 
    category: "Meat & Poultry" 
  },
  
  // Poultry
  "chicken": { 
    minMonths: 9, 
    maxMonths: 12, 
    category: "Meat & Poultry" 
  },
  "chicken breast": { 
    minMonths: 9, 
    maxMonths: 9, 
    category: "Meat & Poultry" 
  },
  "chicken thighs": { 
    minMonths: 9, 
    maxMonths: 9, 
    category: "Meat & Poultry" 
  },
  "chicken legs": { 
    minMonths: 9, 
    maxMonths: 9, 
    category: "Meat & Poultry" 
  },
  "chicken wings": { 
    minMonths: 9, 
    maxMonths: 9, 
    category: "Meat & Poultry" 
  },
  "ground chicken": { 
    minMonths: 3, 
    maxMonths: 4, 
    category: "Meat & Poultry" 
  },
  "rotisserie chicken": { 
    minMonths: 4, 
    maxMonths: 4, 
    category: "Meat & Poultry" 
  },
  "turkey": { 
    minMonths: 12, 
    maxMonths: 12, 
    category: "Meat & Poultry" 
  },
  "ground turkey": { 
    minMonths: 3, 
    maxMonths: 4, 
    category: "Meat & Poultry" 
  },
  "turkey breast": { 
    minMonths: 9, 
    maxMonths: 9, 
    category: "Meat & Poultry" 
  },
  "duck": { 
    minMonths: 6, 
    maxMonths: 6, 
    category: "Meat & Poultry" 
  },
  "goose": { 
    minMonths: 6, 
    maxMonths: 6, 
    category: "Meat & Poultry" 
  },
  "cornish hen": { 
    minMonths: 12, 
    maxMonths: 12, 
    category: "Meat & Poultry" 
  },
  
  // Seafood
  "fish": { 
    minMonths: 6, 
    maxMonths: 8, 
    category: "Seafood" 
  },
  "salmon": { 
    minMonths: 2, 
    maxMonths: 3, 
    category: "Seafood" 
  },
  "tuna": { 
    minMonths: 2, 
    maxMonths: 3, 
    category: "Seafood" 
  },
  "cod": { 
    minMonths: 6, 
    maxMonths: 8, 
    category: "Seafood" 
  },
  "tilapia": { 
    minMonths: 6, 
    maxMonths: 8, 
    category: "Seafood" 
  },
  "halibut": { 
    minMonths: 6, 
    maxMonths: 8, 
    category: "Seafood" 
  },
  "flounder": { 
    minMonths: 6, 
    maxMonths: 8, 
    category: "Seafood" 
  },
  "shrimp": { 
    minMonths: 6, 
    maxMonths: 18, 
    category: "Seafood" 
  },
  "crab": { 
    minMonths: 6, 
    maxMonths: 18, 
    category: "Seafood" 
  },
  "lobster": { 
    minMonths: 6, 
    maxMonths: 18, 
    category: "Seafood" 
  },
  "scallops": { 
    minMonths: 6, 
    maxMonths: 18, 
    category: "Seafood" 
  },
  "clams": { 
    minMonths: 3, 
    maxMonths: 4, 
    category: "Seafood" 
  },
  "oysters": { 
    minMonths: 3, 
    maxMonths: 4, 
    category: "Seafood" 
  },
  "mussels": { 
    minMonths: 3, 
    maxMonths: 4, 
    category: "Seafood" 
  },
  
  // Dairy
  "butter": { 
    minMonths: 6, 
    maxMonths: 9, 
    category: "Dairy & Alternatives" 
  },
  "cheese": { 
    minMonths: 6, 
    maxMonths: 6, 
    category: "Dairy & Alternatives" 
  },
  "milk": { 
    minMonths: 3, 
    maxMonths: 3, 
    category: "Dairy & Alternatives" 
  },
  "yogurt": { 
    minMonths: 1, 
    maxMonths: 2, 
    category: "Dairy & Alternatives" 
  },
  "cream": { 
    minMonths: 3, 
    maxMonths: 4, 
    category: "Dairy & Alternatives" 
  },
  "ice cream": { 
    minMonths: 6, 
    maxMonths: 6, 
    category: "Dairy & Alternatives" 
  },
  "cottage cheese": { 
    minMonths: 3, 
    maxMonths: 3, 
    category: "Dairy & Alternatives" 
  },
  "sour cream": { 
    minMonths: 2, 
    maxMonths: 2, 
    category: "Dairy & Alternatives" 
  },
  
  // Fruits and Vegetables
  "fruit": { 
    minMonths: 10, 
    maxMonths: 12, 
    category: "Fruits & Vegetables" 
  },
  "apples": { 
    minMonths: 8, 
    maxMonths: 8, 
    category: "Fruits & Vegetables" 
  },
  "bananas": { 
    minMonths: 2, 
    maxMonths: 3, 
    category: "Fruits & Vegetables" 
  },
  "berries": { 
    minMonths: 8, 
    maxMonths: 12, 
    category: "Fruits & Vegetables" 
  },
  "strawberries": { 
    minMonths: 8, 
    maxMonths: 12, 
    category: "Fruits & Vegetables" 
  },
  "blueberries": { 
    minMonths: 8, 
    maxMonths: 12, 
    category: "Fruits & Vegetables" 
  },
  "raspberries": { 
    minMonths: 8, 
    maxMonths: 12, 
    category: "Fruits & Vegetables" 
  },
  "blackberries": { 
    minMonths: 8, 
    maxMonths: 12, 
    category: "Fruits & Vegetables" 
  },
  "cherries": { 
    minMonths: 8, 
    maxMonths: 12, 
    category: "Fruits & Vegetables" 
  },
  "grapes": { 
    minMonths: 1, 
    maxMonths: 1, 
    category: "Fruits & Vegetables" 
  },
  "melon": { 
    minMonths: 1, 
    maxMonths: 1, 
    category: "Fruits & Vegetables" 
  },
  "watermelon": { 
    minMonths: 12, 
    maxMonths: 12, 
    category: "Fruits & Vegetables" 
  },
  "cantaloupe": { 
    minMonths: 12, 
    maxMonths: 12, 
    category: "Fruits & Vegetables" 
  },
  "honeydew": { 
    minMonths: 12, 
    maxMonths: 12, 
    category: "Fruits & Vegetables" 
  },
  "pineapple": { 
    minMonths: 10, 
    maxMonths: 12, 
    category: "Fruits & Vegetables" 
  },
  "mango": { 
    minMonths: 6, 
    maxMonths: 8, 
    category: "Fruits & Vegetables" 
  },
  "peaches": { 
    minMonths: 2, 
    maxMonths: 2, 
    category: "Fruits & Vegetables" 
  },
  "plums": { 
    minMonths: 2, 
    maxMonths: 2, 
    category: "Fruits & Vegetables" 
  },
  "pears": { 
    minMonths: 2, 
    maxMonths: 2, 
    category: "Fruits & Vegetables" 
  },
  "vegetable": { 
    minMonths: 10, 
    maxMonths: 18, 
    category: "Fruits & Vegetables" 
  },
  "vegetables": { 
    minMonths: 10, 
    maxMonths: 18, 
    category: "Fruits & Vegetables" 
  },
  "broccoli": { 
    minMonths: 10, 
    maxMonths: 12, 
    category: "Fruits & Vegetables" 
  },
  "cauliflower": { 
    minMonths: 10, 
    maxMonths: 12, 
    category: "Fruits & Vegetables" 
  },
  "carrots": { 
    minMonths: 10, 
    maxMonths: 12, 
    category: "Fruits & Vegetables" 
  },
  "corn": { 
    minMonths: 8, 
    maxMonths: 8, 
    category: "Fruits & Vegetables" 
  },
  "peas": { 
    minMonths: 8, 
    maxMonths: 8, 
    category: "Fruits & Vegetables" 
  },
  "green beans": { 
    minMonths: 8, 
    maxMonths: 8, 
    category: "Fruits & Vegetables" 
  },
  "spinach": { 
    minMonths: 10, 
    maxMonths: 12, 
    category: "Fruits & Vegetables" 
  },
  "asparagus": { 
    minMonths: 5, 
    maxMonths: 5, 
    category: "Fruits & Vegetables" 
  },
  "kale": { 
    minMonths: 8, 
    maxMonths: 12, 
    category: "Fruits & Vegetables" 
  },
  "potatoes": { 
    minMonths: 10, 
    maxMonths: 12, 
    category: "Fruits & Vegetables" 
  },
  "onions": { 
    minMonths: 10, 
    maxMonths: 12, 
    category: "Fruits & Vegetables" 
  },
  "tomatoes": { 
    minMonths: 2, 
    maxMonths: 2, 
    category: "Fruits & Vegetables" 
  },
  "peppers": { 
    minMonths: 6, 
    maxMonths: 8, 
    category: "Fruits & Vegetables" 
  },
  "zucchini": { 
    minMonths: 10, 
    maxMonths: 10, 
    category: "Fruits & Vegetables" 
  },
  "squash": { 
    minMonths: 10, 
    maxMonths: 12, 
    category: "Fruits & Vegetables" 
  },
  "eggplant": { 
    minMonths: 6, 
    maxMonths: 8, 
    category: "Fruits & Vegetables" 
  },
  
  // Bread and Bakery
  "bread": { 
    minMonths: 3, 
    maxMonths: 5, 
    category: "Bakery & Bread" 
  },
  "bagel": { 
    minMonths: 3, 
    maxMonths: 3, 
    category: "Bakery & Bread" 
  },
  "muffin": { 
    minMonths: 2, 
    maxMonths: 3, 
    category: "Bakery & Bread" 
  },
  "cookies": { 
    minMonths: 8, 
    maxMonths: 12, 
    category: "Bakery & Bread" 
  },
  "cake": { 
    minMonths: 6, 
    maxMonths: 6, 
    category: "Bakery & Bread" 
  },
  "pie": { 
    minMonths: 8, 
    maxMonths: 8, 
    category: "Bakery & Bread" 
  },
  "dough": { 
    minMonths: 12, 
    maxMonths: 12, 
    category: "Bakery & Bread" 
  },
  "roll": { 
    minMonths: 3, 
    maxMonths: 5, 
    category: "Bakery & Bread" 
  },
  "rolls": { 
    minMonths: 3, 
    maxMonths: 5, 
    category: "Bakery & Bread" 
  },
  "tortillas": { 
    minMonths: 6, 
    maxMonths: 6, 
    category: "Bakery & Bread" 
  },
  
  // Prepared Foods
  "soup": { 
    minMonths: 2, 
    maxMonths: 3, 
    category: "Soups & Broths" 
  },
  "stew": { 
    minMonths: 2, 
    maxMonths: 3, 
    category: "Prepared Meals" 
  },
  "chili": { 
    minMonths: 2, 
    maxMonths: 3, 
    category: "Prepared Meals" 
  },
  "pizza": { 
    minMonths: 12, 
    maxMonths: 12, 
    category: "Ready-to-Eat" 
  },
  "casserole": { 
    minMonths: 2, 
    maxMonths: 3, 
    category: "Prepared Meals" 
  },
  "pasta": { 
    minMonths: 2, 
    maxMonths: 3, 
    category: "Prepared Meals" 
  },
  "lasagna": { 
    minMonths: 2, 
    maxMonths: 3, 
    category: "Prepared Meals" 
  },
  "rice": { 
    minMonths: 6, 
    maxMonths: 6, 
    category: "Prepared Meals" 
  },
  "meal": { 
    minMonths: 2, 
    maxMonths: 3, 
    category: "Prepared Meals" 
  },
  "leftovers": { 
    minMonths: 2, 
    maxMonths: 3, 
    category: "Prepared Meals" 
  },
  "sauce": { 
    minMonths: 4, 
    maxMonths: 6, 
    category: "Soups & Broths" 
  },
  "gravy": { 
    minMonths: 2, 
    maxMonths: 3, 
    category: "Soups & Broths" 
  },
  "broth": { 
    minMonths: 2, 
    maxMonths: 3, 
    category: "Soups & Broths" 
  },
  "stock": { 
    minMonths: 2, 
    maxMonths: 3, 
    category: "Soups & Broths" 
  }
};

/**
 * Find the best match for a food item name in the foodkeeper database
 * @param itemName The name of the food item
 * @returns The best matching food item or undefined if no match
 */
export const findBestFoodMatch = (itemName: string): string | undefined => {
  if (!itemName) return undefined;
  
  const lowerName = itemName.toLowerCase();
  
  // First check for exact matches
  for (const food of Object.keys(foodkeeperData)) {
    if (lowerName === food.toLowerCase()) {
      return food;
    }
  }
  
  // Next check if any food key is contained in the item name
  for (const food of Object.keys(foodkeeperData)) {
    if (lowerName.includes(food.toLowerCase())) {
      return food;
    }
  }
  
  // Check if item name is contained in any food key
  for (const food of Object.keys(foodkeeperData)) {
    if (food.toLowerCase().includes(lowerName)) {
      return food;
    }
  }
  
  return undefined;
};

/**
 * Get the expiration info for a food item
 * @param itemName The name of the food item
 * @param category Optional category to help with lookup
 * @returns The expiration info or undefined if not found
 */
export const getExpirationInfo = (
  itemName: string, 
  category?: string
): FoodExpirationInfo | undefined => {
  const foodMatch = findBestFoodMatch(itemName);
  
  if (!foodMatch) return undefined;
  
  return foodkeeperData[foodMatch];
};

/**
 * Calculate the expiration date for a food item
 * @param itemName The name of the food item
 * @param category Optional category to help with lookup
 * @param defaultDays The default number of days to use if no match is found
 * @returns The expiration date
 */
export const calculateExpirationDate = (
  itemName: string,
  category?: string,
  defaultDays: number = 30
): Date => {
  logger.debug(`FoodKeeper: Looking up expiration data for "${itemName}"${category ? ` (${category})` : ''}`);
  
  const info = getExpirationInfo(itemName, category);
  
  // If no info is found, use the default days
  if (!info) {
    logger.debug(`❌ FoodKeeper match not found for "${itemName}"`);
    logger.debug(`FoodKeeper: No data found for "${itemName}", using default ${defaultDays} days`);
    const date = new Date();
    date.setDate(date.getDate() + defaultDays);
    return date;
  }
  
  // Use the average of min and max months
  const avgMonths = (info.minMonths + info.maxMonths) / 2;
  
  // Convert months to days and add to current date
  const days = Math.round(avgMonths * 30.44); // average days per month
  
  const date = new Date();
  date.setDate(date.getDate() + days);
  
  logger.debug(`✅ FoodKeeper match found for "${itemName}"`);
  logger.debug(`FoodKeeper: Found data for "${itemName}": ${info.minMonths}-${info.maxMonths} months, using ${days} days`);
  
  return date;
};
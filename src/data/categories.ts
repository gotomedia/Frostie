// Centralized list of categories for freezer and shopping items
// This ensures consistency across the application

/**
 * Predefined categories for freezer and shopping items
 */
export const CATEGORIES = [
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
] as const;

export type CategoryType = typeof CATEGORIES[number];

/**
 * Get all categories with an optional "All Categories" option at the beginning
 * @param includeAllOption Whether to include an "All Categories" option
 */
export const getCategories = (includeAllOption: boolean = false): string[] => {
  if (includeAllOption) {
    return ['All Categories', ...CATEGORIES];
  }
  return [...CATEGORIES];
};

/**
 * Guess category based on item name
 * @param itemName The name of the item
 * @returns The best matching category
 */
export const guessCategory = (itemName: string): CategoryType => {
  const lowerCaseName = itemName.toLowerCase();
  
  // Mapping of keywords to categories
  const categoryMappings: { [key: string]: CategoryType } = {
    // Meat & Poultry
    'meat': 'Meat & Poultry',
    'chicken': 'Meat & Poultry',
    'beef': 'Meat & Poultry',
    'pork': 'Meat & Poultry',
    'turkey': 'Meat & Poultry',
    'lamb': 'Meat & Poultry',
    'steak': 'Meat & Poultry',
    'ground': 'Meat & Poultry',
    'burger': 'Meat & Poultry',
    'sausage': 'Meat & Poultry',
    'bacon': 'Meat & Poultry',
    
    // Seafood
    'fish': 'Seafood',
    'shrimp': 'Seafood',
    'seafood': 'Seafood',
    'scallop': 'Seafood',
    'salmon': 'Seafood',
    'tuna': 'Seafood',
    'cod': 'Seafood',
    'tilapia': 'Seafood',
    'crab': 'Seafood',
    'lobster': 'Seafood',
    
    // Fruits & Vegetables
    'vegetable': 'Fruits & Vegetables',
    'veg': 'Fruits & Vegetables',
    'fruit': 'Fruits & Vegetables',
    'berry': 'Fruits & Vegetables',
    'berries': 'Fruits & Vegetables',
    'broccoli': 'Fruits & Vegetables',
    'carrot': 'Fruits & Vegetables',
    'spinach': 'Fruits & Vegetables',
    'banana': 'Fruits & Vegetables',
    'apple': 'Fruits & Vegetables',
    'peas': 'Fruits & Vegetables',
    'corn': 'Fruits & Vegetables',
    
    // Prepared Meals
    'leftover': 'Prepared Meals',
    'meal prep': 'Prepared Meals',
    'casserole': 'Prepared Meals',
    'stew': 'Prepared Meals',
    'prepared': 'Prepared Meals',
    
    // Ready-to-Eat
    'dinner': 'Ready-to-Eat',
    'pizza': 'Ready-to-Eat',
    'breakfast': 'Ready-to-Eat',
    'meal': 'Ready-to-Eat',
    'nugget': 'Ready-to-Eat',
    'fries': 'Ready-to-Eat',
    
    // Bakery & Bread
    'bread': 'Bakery & Bread',
    'dough': 'Bakery & Bread',
    'pastry': 'Bakery & Bread',
    'bagel': 'Bakery & Bread',
    'muffin': 'Bakery & Bread',
    'roll': 'Bakery & Bread',
    'bun': 'Bakery & Bread',
    
    // Dairy & Alternatives
    'ice cream': 'Dairy & Alternatives',
    'butter': 'Dairy & Alternatives',
    'cheese': 'Dairy & Alternatives',
    'milk': 'Dairy & Alternatives',
    'yogurt': 'Dairy & Alternatives',
    'cream': 'Dairy & Alternatives',
    
    // Soups & Broths
    'soup': 'Soups & Broths',
    'broth': 'Soups & Broths',
    'stock': 'Soups & Broths',
    'chili': 'Soups & Broths',
    
    // Herbs & Seasonings
    'herb': 'Herbs & Seasonings',
    'spice': 'Herbs & Seasonings',
    'season': 'Herbs & Seasonings',
    'basil': 'Herbs & Seasonings',
    'mint': 'Herbs & Seasonings',
    'parsley': 'Herbs & Seasonings',
    'thyme': 'Herbs & Seasonings',
    'oregano': 'Herbs & Seasonings',
  };
  
  // Check for matches in the mapping
  for (const [keyword, category] of Object.entries(categoryMappings)) {
    if (lowerCaseName.includes(keyword)) {
      return category;
    }
  }
  
  // Default category if no matches found
  return 'Other';
};
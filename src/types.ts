export interface FreezerItem {
  id: string;
  name: string;
  addedDate: Date;
  expirationDate: Date;
  category: string;
  quantity: number;
  size: string;
  tags: string[];
  notes: string;
  imageUrl?: string; // Add optional imageUrl field
  source?: 'text' | 'voice' | 'image' | 'barcode' | 'manual'; // Add source field
  user_id?: string; // Add user_id field for Supabase
}

export interface ShoppingItem {
  id: string;
  name: string;
  completed: boolean;
  category: string;
  quantity?: string;
  user_id?: string; // Add user_id field for Supabase
}

export interface MealIdea {
  id: string;
  title: string;
  description: string;
  ingredients: string[];
  imageUrl: string;
  matchedItems?: string[];
  vegetarian?: boolean;
  vegan?: boolean;
  glutenFree?: boolean;
  dairyFree?: boolean;
  favorite?: boolean;
  cookingTime: string; // Required field to match database constraints
  user_id?: string; // Add user_id field for Supabase
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  notificationTiming: number; // Days before expiration to notify (3, 7, 14, 30)
  dietary: {
    vegetarian: boolean;
    vegan: boolean;
    glutenFree: boolean;
    dairyFree: boolean;
  }
}
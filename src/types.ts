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
}

export interface ShoppingItem {
  id: string;
  name: string;
  completed: boolean;
  category: string;
  quantity?: string;
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
}
import { FreezerItem, ShoppingItem, MealIdea } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { SupabaseClient } from '@supabase/supabase-js';
import { UserSettings } from '../types';

// Abstract Storage Interface for all types of data
export interface StorageInterface<T> {
  getItems(): Promise<T[]>;
  addItem(item: T): Promise<T>;
  updateItem(item: T): Promise<T>;
  deleteItem(id: string): Promise<void>;
}

// Freezer Item Storage Interface
export interface FreezerItemsStorage extends StorageInterface<FreezerItem> {
  getExpiringItems(days: number): Promise<FreezerItem[]>;
}

// Shopping Item Storage Interface
export interface ShoppingItemsStorage extends StorageInterface<ShoppingItem> {
  getCompletedItems(): Promise<ShoppingItem[]>;
  getIncompleteItems(): Promise<ShoppingItem[]>;
}

// Meal Idea Storage Interface
export interface MealIdeasStorage extends StorageInterface<MealIdea> {
  getFavorites(): Promise<MealIdea[]>;
}

// Settings Storage Interface
export interface SettingsStorage {
  getSettings(): Promise<UserSettings | null>;
  saveSettings(settings: UserSettings): Promise<void>;
}

// Convert a date string to a Date object
const parseDate = (dateStr: string | Date): Date => {
  if (dateStr instanceof Date) return dateStr;
  return new Date(dateStr);
};

// LocalStorage provider for FreezerItems
export class FreezerItemsLocalStorage implements FreezerItemsStorage {
  private readonly STORAGE_KEY = 'freezerItems';

  async getItems(): Promise<FreezerItem[]> {
    const items = localStorage.getItem(this.STORAGE_KEY);
    if (!items) return [];
    
    return JSON.parse(items, (key, value) => {
      // Convert date strings to Date objects
      if (key === 'addedDate' || key === 'expirationDate') {
        return new Date(value);
      }
      return value;
    });
  }

  async addItem(item: FreezerItem): Promise<FreezerItem> {
    const items = await this.getItems();
    
    // Ensure the item has a valid UUID
    if (!item.id) {
      item.id = uuidv4();
    }
    
    items.push(item);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    return item;
  }

  async updateItem(item: FreezerItem): Promise<FreezerItem> {
    const items = await this.getItems();
    const index = items.findIndex(i => i.id === item.id);
    
    if (index === -1) {
      throw new Error(`Item with id ${item.id} not found`);
    }
    
    items[index] = item;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    return item;
  }

  async deleteItem(id: string): Promise<void> {
    const items = await this.getItems();
    const filteredItems = items.filter(i => i.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredItems));
  }

  async getExpiringItems(days: number): Promise<FreezerItem[]> {
    const items = await this.getItems();
    const today = new Date();
    
    return items.filter(item => {
      const expirationDate = new Date(item.expirationDate);
      const diffTime = expirationDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= days;
    });
  }
}

// LocalStorage provider for ShoppingItems
export class ShoppingItemsLocalStorage implements ShoppingItemsStorage {
  private readonly STORAGE_KEY = 'shoppingItems';

  async getItems(): Promise<ShoppingItem[]> {
    const items = localStorage.getItem(this.STORAGE_KEY);
    return items ? JSON.parse(items) : [];
  }

  async addItem(item: ShoppingItem): Promise<ShoppingItem> {
    const items = await this.getItems();
    
    // Ensure item has an id
    if (!item.id) {
      item.id = uuidv4();
    }
    
    items.push(item);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    return item;
  }

  async updateItem(item: ShoppingItem): Promise<ShoppingItem> {
    const items = await this.getItems();
    const index = items.findIndex(i => i.id === item.id);
    
    if (index === -1) {
      throw new Error(`Item with id ${item.id} not found`);
    }
    
    items[index] = item;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    return item;
  }

  async deleteItem(id: string): Promise<void> {
    const items = await this.getItems();
    const filteredItems = items.filter(i => i.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredItems));
  }

  async getCompletedItems(): Promise<ShoppingItem[]> {
    const items = await this.getItems();
    return items.filter(item => item.completed);
  }

  async getIncompleteItems(): Promise<ShoppingItem[]> {
    const items = await this.getItems();
    return items.filter(item => !item.completed);
  }
}

// LocalStorage provider for MealIdeas
export class MealIdeasLocalStorage implements MealIdeasStorage {
  private readonly STORAGE_KEY = 'mealIdeas';

  async getItems(): Promise<MealIdea[]> {
    const items = localStorage.getItem(this.STORAGE_KEY);
    return items ? JSON.parse(items) : [];
  }

  async addItem(item: MealIdea): Promise<MealIdea> {
    const items = await this.getItems();
    
    // Ensure item has an id
    if (!item.id) {
      item.id = uuidv4();
    }
    
    items.push(item);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    return item;
  }

  async updateItem(item: MealIdea): Promise<MealIdea> {
    const items = await this.getItems();
    const index = items.findIndex(i => i.id === item.id);
    
    if (index === -1) {
      throw new Error(`Item with id ${item.id} not found`);
    }
    
    items[index] = item;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(items));
    return item;
  }

  async deleteItem(id: string): Promise<void> {
    const items = await this.getItems();
    const filteredItems = items.filter(i => i.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredItems));
  }

  async getFavorites(): Promise<MealIdea[]> {
    const items = await this.getItems();
    return items.filter(item => item.favorite);
  }
}

// LocalStorage provider for Settings
export class SettingsLocalStorage implements SettingsStorage {
  private readonly STORAGE_KEY = 'userSettings';

  async getSettings(): Promise<UserSettings | null> {
    const settings = localStorage.getItem(this.STORAGE_KEY);
    return settings ? JSON.parse(settings) : null;
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
  }
}

// Supabase provider for FreezerItems
export class FreezerItemsSupabase implements FreezerItemsStorage {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  async getItems(): Promise<FreezerItem[]> {
    const { data, error } = await this.supabase
      .from('freezer_items')
      .select('*')
      .eq('user_id', this.userId)
      .order('expiry_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching freezer items:', error);
      throw error;
    }
    
    return data.map(item => ({
      id: item.id,
      name: item.name,
      addedDate: parseDate(item.added_date),
      expirationDate: parseDate(item.expiry_date),
      category: item.category || 'Other',
      quantity: item.quantity ? Number(item.quantity) : 1,
      size: item.size || '',
      tags: item.tags || [],
      notes: item.notes || '',
      imageUrl: item.image_url || ''
    }));
  }

  async addItem(item: FreezerItem): Promise<FreezerItem> {
    // Convert from app format to DB format
    const dbItem = {
      id: item.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id) 
        ? item.id 
        : uuidv4(),
      user_id: this.userId,
      name: item.name,
      quantity: String(item.quantity),
      size: item.size,
      category: item.category,
      expiry_date: item.expirationDate.toISOString(),
      added_date: item.addedDate.toISOString(),
      notes: item.notes,
      tags: item.tags,
      image_url: item.imageUrl || '',
      created_at: new Date().toISOString()
    };
    
    // Add console log to confirm user_id is present
    console.log('Adding freezer item with dbItem:', dbItem);
    
    const { data, error } = await this.supabase
      .from('freezer_items')
      .insert([dbItem])
      .select()
      .single();
    
    if (error) {
      console.error('Error adding freezer item:', error);
      throw error;
    }
    
    // Return the item in app format
    return {
      id: data.id,
      name: data.name,
      addedDate: parseDate(data.added_date),
      expirationDate: parseDate(data.expiry_date),
      category: data.category || 'Other',
      quantity: data.quantity ? Number(data.quantity) : 1,
      size: data.size || '',
      tags: data.tags || [],
      notes: data.notes || '',
      imageUrl: data.image_url || ''
    };
  }

  async updateItem(item: FreezerItem): Promise<FreezerItem> {
    // Convert from app format to DB format
    const dbItem = {
      name: item.name,
      quantity: String(item.quantity),
      size: item.size,
      category: item.category,
      expiry_date: item.expirationDate.toISOString(),
      notes: item.notes,
      tags: item.tags,
      image_url: item.imageUrl || ''
    };
    
    const { data, error } = await this.supabase
      .from('freezer_items')
      .update(dbItem)
      .eq('id', item.id)
      .eq('user_id', this.userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating freezer item:', error);
      throw error;
    }
    
    // Return the updated item in app format
    return {
      id: data.id,
      name: data.name,
      addedDate: parseDate(data.added_date),
      expirationDate: parseDate(data.expiry_date),
      category: data.category || 'Other',
      quantity: data.quantity ? Number(data.quantity) : 1,
      size: data.size || '',
      tags: data.tags || [],
      notes: data.notes || '',
      imageUrl: data.image_url || ''
    };
  }

  async deleteItem(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('freezer_items')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId);
    
    if (error) {
      console.error('Error deleting freezer item:', error);
      throw error;
    }
  }

  async getExpiringItems(days: number): Promise<FreezerItem[]> {
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);
    
    const { data, error } = await this.supabase
      .from('freezer_items')
      .select('*')
      .eq('user_id', this.userId)
      .gte('expiry_date', now.toISOString())
      .lte('expiry_date', futureDate.toISOString())
      .order('expiry_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching expiring freezer items:', error);
      throw error;
    }
    
    return data.map(item => ({
      id: item.id,
      name: item.name,
      addedDate: parseDate(item.added_date),
      expirationDate: parseDate(item.expiry_date),
      category: item.category || 'Other',
      quantity: item.quantity ? Number(item.quantity) : 1,
      size: item.size || '',
      tags: item.tags || [],
      notes: item.notes || '',
      imageUrl: item.image_url || ''
    }));
  }
}

// Supabase provider for ShoppingItems
export class ShoppingItemsSupabase implements ShoppingItemsStorage {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  async getItems(): Promise<ShoppingItem[]> {
    const { data, error } = await this.supabase
      .from('shopping_items')
      .select('*')
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching shopping items:', error);
      throw error;
    }
    
    return data.map(item => ({
      id: item.id,
      name: item.name,
      completed: item.completed,
      category: item.category || 'Other',
      quantity: item.quantity
    }));
  }

  async addItem(item: ShoppingItem): Promise<ShoppingItem> {
    // Ensure the item has a valid UUID
    const itemId = item.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id)
      ? item.id
      : uuidv4();
    
    // Convert from app format to DB format
    const dbItem = {
      id: itemId,
      user_id: this.userId,
      name: item.name,
      quantity: item.quantity || '1',
      completed: item.completed || false,
      category: item.category || 'Other'
    };
    
    const { data, error } = await this.supabase
      .from('shopping_items')
      .insert([dbItem])
      .select()
      .single();
    
    if (error) {
      console.error('Error adding shopping item:', error);
      throw error;
    }
    
    // Return the item in app format
    return {
      id: data.id,
      name: data.name,
      completed: data.completed,
      category: data.category || 'Other',
      quantity: data.quantity
    };
  }

  async updateItem(item: ShoppingItem): Promise<ShoppingItem> {
    // Convert from app format to DB format
    const dbItem = {
      name: item.name,
      quantity: item.quantity || '1',
      completed: item.completed,
      category: item.category || 'Other'
    };
    
    const { data, error } = await this.supabase
      .from('shopping_items')
      .update(dbItem)
      .eq('id', item.id)
      .eq('user_id', this.userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating shopping item:', error);
      throw error;
    }
    
    // Return the updated item in app format
    return {
      id: data.id,
      name: data.name,
      completed: data.completed,
      category: data.category || 'Other',
      quantity: data.quantity
    };
  }

  async deleteItem(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('shopping_items')
      .delete()
      .eq('id', id)
      .eq('user_id', this.userId);
    
    if (error) {
      console.error('Error deleting shopping item:', error);
      throw error;
    }
  }

  async getCompletedItems(): Promise<ShoppingItem[]> {
    const { data, error } = await this.supabase
      .from('shopping_items')
      .select('*')
      .eq('user_id', this.userId)
      .eq('completed', true)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching completed shopping items:', error);
      throw error;
    }
    
    return data.map(item => ({
      id: item.id,
      name: item.name,
      completed: item.completed,
      category: item.category || 'Other',
      quantity: item.quantity
    }));
  }

  async getIncompleteItems(): Promise<ShoppingItem[]> {
    const { data, error } = await this.supabase
      .from('shopping_items')
      .select('*')
      .eq('user_id', this.userId)
      .eq('completed', false)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching incomplete shopping items:', error);
      throw error;
    }
    
    return data.map(item => ({
      id: item.id,
      name: item.name,
      completed: item.completed,
      category: item.category || 'Other',
      quantity: item.quantity
    }));
  }
}

// Supabase provider for MealIdeas
export class MealIdeasSupabase implements MealIdeasStorage {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  async getItems(): Promise<MealIdea[]> {
    const { data, error } = await this.supabase
      .from('meal_ideas')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching meal ideas:', error);
      throw error;
    }
    
    return data.map(idea => ({
      id: idea.id,
      title: idea.title,
      description: idea.description,
      imageUrl: idea.image_url,
      ingredients: idea.ingredients,
      matchedItems: [], // This will be populated client-side
      vegetarian: idea.vegetarian || false,
      vegan: idea.vegan || false,
      glutenFree: idea.gluten_free || false,
      dairyFree: idea.dairy_free || false,
      favorite: idea.favorite || false,
      cookingTime: idea.cooking_time || '30 minutes',
      user_id: idea.user_id
    }));
  }

  async addItem(idea: MealIdea): Promise<MealIdea> {
    // Ensure the idea has a valid UUID
    const ideaId = idea.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idea.id)
      ? idea.id
      : uuidv4();
    
    // Convert from app format to DB format
    const dbItem = {
      id: ideaId,
      user_id: this.userId, // Add user_id field
      title: idea.title,
      description: idea.description,
      image_url: idea.imageUrl,
      ingredients: idea.ingredients,
      vegetarian: idea.vegetarian || false,
      vegan: idea.vegan || false,
      gluten_free: idea.glutenFree || false,
      dairy_free: idea.dairyFree || false,
      favorite: idea.favorite || false,
      cooking_time: idea.cookingTime || '30 minutes',
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await this.supabase
      .from('meal_ideas')
      .insert([dbItem])
      .select()
      .single();
    
    if (error) {
      console.error('Error adding meal idea:', error);
      throw error;
    }
    
    // Return the idea in app format
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      imageUrl: data.image_url,
      ingredients: data.ingredients,
      matchedItems: [], // This will be populated client-side
      vegetarian: data.vegetarian || false,
      vegan: data.vegan || false,
      glutenFree: data.gluten_free || false,
      dairyFree: data.dairy_free || false,
      favorite: data.favorite || false,
      cookingTime: data.cooking_time || '30 minutes',
      user_id: data.user_id
    };
  }

  async updateItem(idea: MealIdea): Promise<MealIdea> {
    // Convert from app format to DB format
    const dbItem = {
      title: idea.title,
      description: idea.description,
      image_url: idea.imageUrl,
      ingredients: idea.ingredients,
      vegetarian: idea.vegetarian || false,
      vegan: idea.vegan || false,
      gluten_free: idea.glutenFree || false,
      dairy_free: idea.dairyFree || false,
      favorite: idea.favorite || false,
      cooking_time: idea.cookingTime || '30 minutes'
    };
    
    const { data, error } = await this.supabase
      .from('meal_ideas')
      .update(dbItem)
      .eq('id', idea.id)
      // Include user_id in the where clause
      .eq('user_id', this.userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating meal idea:', error);
      throw error;
    }
    
    // Return the updated idea in app format
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      imageUrl: data.image_url,
      ingredients: data.ingredients,
      matchedItems: [], // This will be populated client-side
      vegetarian: data.vegetarian || false,
      vegan: data.vegan || false,
      glutenFree: data.gluten_free || false,
      dairyFree: data.dairy_free || false,
      favorite: data.favorite || false,
      cookingTime: data.cooking_time || '30 minutes',
      user_id: data.user_id
    };
  }

  async deleteItem(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('meal_ideas')
      .delete()
      .eq('id', id)
      // Include user_id in the where clause
      .eq('user_id', this.userId);
    
    if (error) {
      console.error('Error deleting meal idea:', error);
      throw error;
    }
  }

  async getFavorites(): Promise<MealIdea[]> {
    const { data, error } = await this.supabase
      .from('meal_ideas')
      .select('*')
      .eq('favorite', true)
      // Include user_id in the where clause
      .eq('user_id', this.userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching favorite meal ideas:', error);
      throw error;
    }
    
    return data.map(idea => ({
      id: idea.id,
      title: idea.title,
      description: idea.description,
      imageUrl: idea.image_url,
      ingredients: idea.ingredients,
      matchedItems: [], // This will be populated client-side
      vegetarian: idea.vegetarian || false,
      vegan: idea.vegan || false,
      glutenFree: idea.gluten_free || false,
      dairyFree: idea.dairy_free || false,
      favorite: true,
      cookingTime: idea.cooking_time || '30 minutes',
      user_id: idea.user_id
    }));
  }
}

// Supabase provider for Settings
export class SettingsSupabase implements SettingsStorage {
  constructor(private supabase: SupabaseClient, private userId: string) {}

  async getSettings(): Promise<UserSettings | null> {
    const { data, error } = await this.supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', this.userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') { // Row not found error
        return null;
      }
      console.error('Error fetching user settings:', error);
      throw error;
    }
    
    if (!data) {
      return null;
    }
    
    return {
      theme: data.theme as 'light' | 'dark' | 'system',
      notifications: data.notifications,
      notificationTiming: data.notification_timing || 3,
      dietary: data.dietary || {
        vegetarian: false,
        vegan: false,
        glutenFree: false,
        dairyFree: false
      }
    };
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    // Check if settings already exist for this user
    const { data: existingSettings, error: fetchError } = await this.supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', this.userId)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      // Handle error, but skip "not found" error as that's expected if no settings exist
      console.error('Error checking existing settings:', fetchError);
      throw fetchError;
    }
    
    // Convert from app format to DB format
    const dbSettings = {
      user_id: this.userId,
      theme: settings.theme,
      notifications: settings.notifications,
      notification_timing: settings.notificationTiming,
      dietary: settings.dietary,
      updated_at: new Date().toISOString()
    };
    
    if (existingSettings) {
      // Update existing settings
      const { error: updateError } = await this.supabase
        .from('user_settings')
        .update(dbSettings)
        .eq('user_id', this.userId);
      
      if (updateError) {
        console.error('Error updating user settings:', updateError);
        throw updateError;
      }
    } else {
      // Insert new settings
      const { error: insertError } = await this.supabase
        .from('user_settings')
        .insert([{
          ...dbSettings,
          created_at: new Date().toISOString()
        }]);
      
      if (insertError) {
        console.error('Error inserting user settings:', insertError);
        
        // If we get a duplicate key error, try updating instead
        if (insertError.code === '23505') { // PostgreSQL unique violation code
          const { error: fallbackError } = await this.supabase
            .from('user_settings')
            .update(dbSettings)
            .eq('user_id', this.userId);
          
          if (fallbackError) {
            console.error('Error in fallback update of user settings:', fallbackError);
            throw fallbackError;
          }
        } else {
          throw insertError;
        }
      }
    }
  }
}
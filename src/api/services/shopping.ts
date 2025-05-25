import { v4 as uuidv4 } from 'uuid';
import { supabase } from './client';
import { ShoppingItem } from '../../types';
import { logger } from "@/lib/logger";

export const fetchShoppingItems = async (): Promise<ShoppingItem[]> => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user) {
    logger.debug('No authenticated user, returning empty array');
    return [];
  }
  
  const { data, error } = await supabase
    .from('shopping_items')
    .select('*')
    .eq('user_id', user.user.id)
    .order('created_at', { ascending: false });
  
  if (error) {
    logger.error('Error fetching shopping items:', error);
    throw error;
  }
  
  // Transform from DB format to app format
  return data.map(item => ({
    id: item.id,
    name: item.name,
    completed: item.completed,
    category: item.category || 'Other'
  }));
};

export const addShoppingItem = async (item: ShoppingItem): Promise<ShoppingItem> => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user) {
    logger.error('No authenticated user');
    throw new Error('User must be authenticated to add items');
  }
  
  // Ensure the item has a valid UUID
  const itemId = item.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id)
    ? item.id
    : uuidv4();
  
  // Convert from app format to DB format
  const dbItem = {
    id: itemId,
    user_id: user.user.id,
    name: item.name,
    quantity: item.quantity || '1',
    completed: item.completed || false,
    category: item.category || 'Other'
  };
  
  const { data, error } = await supabase
    .from('shopping_items')
    .insert([dbItem])
    .select()
    .single();
  
  if (error) {
    logger.error('Error adding shopping item:', error);
    throw error;
  }
  
  // Return the item in app format
  return {
    id: data.id,
    name: data.name,
    completed: data.completed,
    category: data.category || 'Other'
  };
};

export const updateShoppingItem = async (item: ShoppingItem): Promise<ShoppingItem> => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user) {
    logger.error('No authenticated user');
    throw new Error('User must be authenticated to update items');
  }
  
  // Convert from app format to DB format
  const dbItem = {
    name: item.name,
    quantity: item.quantity || '1',
    completed: item.completed,
    category: item.category || 'Other'
  };
  
  const { data, error } = await supabase
    .from('shopping_items')
    .update(dbItem)
    .eq('id', item.id)
    .eq('user_id', user.user.id)
    .select()
    .single();
  
  if (error) {
    logger.error('Error updating shopping item:', error);
    throw error;
  }
  
  // Return the updated item in app format
  return {
    id: data.id,
    name: data.name,
    completed: data.completed,
    category: data.category || 'Other'
  };
};

export const deleteShoppingItem = async (id: string): Promise<void> => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user) {
    logger.error('No authenticated user');
    throw new Error('User must be authenticated to delete items');
  }
  
  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.user.id);
  
  if (error) {
    logger.error('Error deleting shopping item:', error);
    throw error;
  }
};

export const subscribeToShoppingItems = (
  onInsert: (item: ShoppingItem) => void,
  onUpdate: (item: ShoppingItem) => void,
  onDelete: (id: string) => void
) => {
  const { data: user } = supabase.auth.getUser();
  
  if (!user) {
    logger.debug('No authenticated user for real-time subscription');
    return null;
  }
  
  return supabase
    .channel('shopping-items-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'shopping_items'
      },
      (payload) => {
        const newItem = payload.new as any;
        // Only process if this is for the current user
        if (newItem.user_id === user.user?.id) {
          onInsert({
            id: newItem.id,
            name: newItem.name,
            completed: newItem.completed,
            category: newItem.category || 'Other'
          });
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'shopping_items'
      },
      (payload) => {
        const updatedItem = payload.new as any;
        // Only process if this is for the current user
        if (updatedItem.user_id === user.user?.id) {
          onUpdate({
            id: updatedItem.id,
            name: updatedItem.name,
            completed: updatedItem.completed,
            category: updatedItem.category || 'Other'
          });
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'shopping_items'
      },
      (payload) => {
        // Only process if this is for the current user
        if (payload.old.user_id === user.user?.id) {
          onDelete(payload.old.id);
        }
      }
    )
    .subscribe();
};
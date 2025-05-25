import { v4 as uuidv4 } from 'uuid';
import { supabase } from './client';
import { FreezerItem } from '../../types';
import { logger } from "@/lib/logger";

export const fetchFreezerItems = async (): Promise<FreezerItem[]> => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user) {
    logger.debug('No authenticated user, returning empty array');
    return [];
  }
  
  const { data, error } = await supabase
    .from('freezer_items')
    .select('*')
    .eq('user_id', user.user.id)
    .order('expiry_date', { ascending: true });
  
  if (error) {
    logger.error('Error fetching freezer items:', error);
    throw error;
  }
  
  logger.debug('Raw freezer items from DB:', data);
  
  // Transform from DB format to app format
  return data.map(item => ({
    id: item.id,
    name: item.name,
    addedDate: new Date(item.added_date),
    expirationDate: new Date(item.expiry_date),
    category: item.category || 'Other',
    quantity: item.quantity ? Number(item.quantity) : 1,
    size: item.size || '', // Use the size field directly
    tags: item.tags || [],
    notes: item.notes || '',
    imageUrl: item.image_url || '' // Include the image URL
  }));
};

export const addFreezerItem = async (item: FreezerItem): Promise<FreezerItem> => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user) {
    logger.error('No authenticated user');
    throw new Error('User must be authenticated to add items');
  }
  
  logger.debug('Adding freezer item to Supabase:', item);
  
  // Ensure the item has a valid UUID before sending to Supabase
  const itemId = item.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(item.id) 
    ? item.id 
    : uuidv4();
  
  // Convert from app format to DB format
  const dbItem = {
    id: itemId,
    user_id: user.user.id,
    name: item.name,
    quantity: String(item.quantity),
    size: item.size, // Include the size field
    category: item.category,
    expiry_date: item.expirationDate.toISOString(),
    added_date: item.addedDate.toISOString(),
    notes: item.notes,
    tags: item.tags,
    image_url: item.imageUrl || '', // Include the image URL
    created_at: new Date().toISOString()
  };
  
  logger.debug('DB item being inserted:', dbItem);
  
  const { data, error } = await supabase
    .from('freezer_items')
    .insert([dbItem])
    .select()
    .single();
  
  if (error) {
    logger.error('Error adding freezer item:', error);
    throw error;
  }
  
  logger.debug('Successfully added freezer item, DB returned:', data);
  
  // Return the item in app format
  return {
    id: data.id,
    name: data.name,
    addedDate: new Date(data.added_date),
    expirationDate: new Date(data.expiry_date),
    category: data.category || 'Other',
    quantity: data.quantity ? Number(data.quantity) : 1,
    size: data.size || '', // Use the size field directly
    tags: data.tags || [],
    notes: data.notes || '',
    imageUrl: data.image_url || '' // Include the image URL
  };
};

export const updateFreezerItem = async (item: FreezerItem): Promise<FreezerItem> => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user) {
    logger.error('No authenticated user');
    throw new Error('User must be authenticated to update items');
  }
  
  logger.debug('Updating freezer item in Supabase:', item);
  
  // Convert from app format to DB format
  const dbItem = {
    name: item.name,
    quantity: String(item.quantity),
    size: item.size, // Include the size field
    category: item.category,
    expiry_date: item.expirationDate.toISOString(),
    notes: item.notes,
    tags: item.tags,
    image_url: item.imageUrl || '' // Include the image URL
  };
  
  logger.debug('DB item being updated:', dbItem);
  
  const { data, error } = await supabase
    .from('freezer_items')
    .update(dbItem)
    .eq('id', item.id)
    .eq('user_id', user.user.id)
    .select()
    .single();
  
  if (error) {
    logger.error('Error updating freezer item:', error);
    throw error;
  }
  
  logger.debug('Successfully updated freezer item, DB returned:', data);
  
  // Return the updated item in app format
  return {
    id: data.id,
    name: data.name,
    addedDate: new Date(data.added_date),
    expirationDate: new Date(data.expiry_date),
    category: data.category || 'Other',
    quantity: data.quantity ? Number(data.quantity) : 1,
    size: data.size || '', // Use the size field directly
    tags: data.tags || [],
    notes: data.notes || '',
    imageUrl: data.image_url || '' // Include the image URL
  };
};

export const deleteFreezerItem = async (id: string): Promise<void> => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user) {
    logger.error('No authenticated user');
    throw new Error('User must be authenticated to delete items');
  }
  
  const { error } = await supabase
    .from('freezer_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.user.id);
  
  if (error) {
    logger.error('Error deleting freezer item:', error);
    throw error;
  }
};

export const subscribeToFreezerItems = (
  onInsert: (item: FreezerItem) => void,
  onUpdate: (item: FreezerItem) => void,
  onDelete: (id: string) => void
) => {
  const { data: user } = supabase.auth.getUser();
  
  if (!user) {
    logger.debug('No authenticated user for real-time subscription');
    return null;
  }
  
  return supabase
    .channel('freezer-items-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'freezer_items'
      },
      (payload) => {
        const newItem = payload.new as any;
        // Only process if this is for the current user
        if (newItem.user_id === user.user?.id) {
          onInsert({
            id: newItem.id,
            name: newItem.name,
            addedDate: new Date(newItem.added_date),
            expirationDate: new Date(newItem.expiry_date),
            category: newItem.category || 'Other',
            quantity: newItem.quantity ? Number(newItem.quantity) : 1,
            size: newItem.size || '',  // Use the size field directly
            tags: newItem.tags || [],
            notes: newItem.notes || '',
            imageUrl: newItem.image_url || '' // Include the image URL
          });
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'freezer_items'
      },
      (payload) => {
        const updatedItem = payload.new as any;
        // Only process if this is for the current user
        if (updatedItem.user_id === user.user?.id) {
          onUpdate({
            id: updatedItem.id,
            name: updatedItem.name,
            addedDate: new Date(updatedItem.added_date),
            expirationDate: new Date(updatedItem.expiry_date),
            category: updatedItem.category || 'Other',
            quantity: updatedItem.quantity ? Number(updatedItem.quantity) : 1,
            size: updatedItem.size || '',  // Use the size field directly
            tags: updatedItem.tags || [],
            notes: updatedItem.notes || '',
            imageUrl: updatedItem.image_url || '' // Include the image URL
          });
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'freezer_items'
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
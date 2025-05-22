import { v4 as uuidv4 } from 'uuid';
import { supabase } from './client';

// Helper function to check if string is a valid UUID
const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

export const migrateLocalDataToSupabase = async (): Promise<void> => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user) {
    console.error('No authenticated user for migration');
    return;
  }
  
  console.log('Migrating local data to Supabase...');
  
  // Get local data
  const freezerItems = JSON.parse(localStorage.getItem('freezerItems') || '[]');
  const shoppingItems = JSON.parse(localStorage.getItem('shoppingItems') || '[]');
  const userSettings = JSON.parse(localStorage.getItem('userSettings') || 'null');
  
  try {
    // Migrate freezer items
    if (freezerItems.length > 0) {
      const dbFreezerItems = freezerItems.map((item: any) => ({
        // Generate a new UUID if the id is not a valid UUID (likely a timestamp)
        id: isValidUUID(item.id) ? item.id : uuidv4(),
        user_id: user.user.id,
        name: item.name,
        quantity: String(item.quantity),
        size: item.size || '', // Include the size field
        category: item.category || 'Other',
        expiry_date: item.expirationDate,
        added_date: item.addedDate,
        notes: item.notes || '',
        tags: item.tags || [],
        image_url: item.imageUrl || '', // Include the image URL
        created_at: new Date().toISOString()
      }));
      
      const { error: freezerError } = await supabase
        .from('freezer_items')
        .insert(dbFreezerItems);
      
      if (freezerError) {
        console.error('Error migrating freezer items:', freezerError);
      } else {
        console.log(`Successfully migrated ${dbFreezerItems.length} freezer items`);
      }
    }
    
    // Migrate shopping items
    if (shoppingItems.length > 0) {
      const dbShoppingItems = shoppingItems.map((item: any) => ({
        // Generate a new UUID if the id is not a valid UUID (likely a timestamp)
        id: isValidUUID(item.id) ? item.id : uuidv4(),
        user_id: user.user.id,
        name: item.name,
        quantity: item.quantity || '1',
        completed: item.completed || false,
        category: item.category || 'Other',
        created_at: new Date().toISOString()
      }));
      
      const { error: shoppingError } = await supabase
        .from('shopping_items')
        .insert(dbShoppingItems);
      
      if (shoppingError) {
        console.error('Error migrating shopping items:', shoppingError);
      } else {
        console.log(`Successfully migrated ${dbShoppingItems.length} shopping items`);
      }
    }
    
    // Migrate user settings
    if (userSettings) {
      // Get existing settings first
      const { data: existingSettings } = await supabase
        .from('user_settings')
        .select('id')
        .eq('user_id', user.user.id)
        .single();
      
      const dbSettings = {
        user_id: user.user.id,
        theme: userSettings.theme || 'system',
        notifications: userSettings.notifications !== undefined ? userSettings.notifications : true,
        notification_timing: userSettings.notificationTiming || 3,
        dietary: userSettings.dietary || {
          vegetarian: false,
          vegan: false,
          glutenFree: false,
          dairyFree: false
        },
        updated_at: new Date().toISOString()
      };
      
      if (existingSettings) {
        // Update existing settings
        const { error: updateError } = await supabase
          .from('user_settings')
          .update(dbSettings)
          .eq('user_id', user.user.id);
        
        if (updateError) {
          console.error('Error updating user settings during migration:', updateError);
        } else {
          console.log('Successfully updated user settings');
        }
      } else {
        // Insert new settings
        const { error: settingsError } = await supabase
          .from('user_settings')
          .insert([{
            ...dbSettings,
            created_at: new Date().toISOString()
          }]);
        
        if (settingsError) {
          console.error('Error migrating user settings:', settingsError);
          
          // If duplicate key, try update instead
          if (settingsError.code === '23505') {
            const { error: fallbackError } = await supabase
              .from('user_settings')
              .update(dbSettings)
              .eq('user_id', user.user.id);
            
            if (fallbackError) {
              console.error('Error in fallback update during migration:', fallbackError);
            } else {
              console.log('Successfully migrated user settings (fallback method)');
            }
          }
        } else {
          console.log('Successfully migrated user settings');
        }
      }
    }
    
    console.log('Data migration completed');
    
    // Mark migration as complete
    localStorage.setItem('dataAlreadyMigrated', 'true');
  } catch (error) {
    console.error('Error during data migration:', error);
  }
};
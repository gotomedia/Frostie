import { supabase } from './client';
import { UserSettings } from '../../types';
import { logger } from "@/lib/logger";

export const fetchUserSettings = async (): Promise<UserSettings | null> => {
  const { data: user } = await supabase.auth.getUser();
  
  if (!user?.user) {
    logger.debug('No authenticated user, checking localStorage');
    // Check if we have settings in localStorage
    const storedSettings = localStorage.getItem('userSettings');
    return storedSettings ? JSON.parse(storedSettings) : null;
  }
  
  try {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.user.id)
      .single();
    
    if (error) {
      logger.error('Error fetching user settings:', error);
      // Fall back to localStorage
      const storedSettings = localStorage.getItem('userSettings');
      return storedSettings ? JSON.parse(storedSettings) : null;
    }
    
    if (!data) {
      // No settings in Supabase, check localStorage
      const storedSettings = localStorage.getItem('userSettings');
      if (storedSettings) {
        // If we have settings in localStorage, save them to Supabase
        const settings = JSON.parse(storedSettings);
        await saveUserSettings(settings);
        return settings;
      }
      return null;
    }
    
    // Transform from DB format to app format
    return {
      theme: data.theme as 'light' | 'dark' | 'system',
      notifications: data.notifications,
      notificationTiming: data.notification_timing || 3,
      dietary: {
        vegetarian: data.dietary?.vegetarian || false,
        vegan: data.dietary?.vegan || false,
        glutenFree: data.dietary?.glutenFree || false,
        dairyFree: data.dietary?.dairyFree || false
      }
    };
  } catch (error) {
    logger.error('Error in fetchUserSettings:', error);
    const storedSettings = localStorage.getItem('userSettings');
    return storedSettings ? JSON.parse(storedSettings) : null;
  }
};

export const saveUserSettings = async (settings: UserSettings): Promise<void> => {
  const { data: user } = await supabase.auth.getUser();
  
  // Always save to localStorage for both guests and authenticated users
  localStorage.setItem('userSettings', JSON.stringify(settings));
  
  if (!user?.user) {
    logger.debug('No authenticated user, settings saved to localStorage only');
    return;
  }
  
  try {
    // Check if settings already exist for this user
    const { data: existingSettings, error: fetchError } = await supabase
      .from('user_settings')
      .select('id')
      .eq('user_id', user.user.id)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      // Handle error, but skip "not found" error as that's expected if no settings exist
      logger.error('Error checking existing settings:', fetchError);
      return;
    }
    
    // Convert from app format to DB format
    const dbSettings = {
      user_id: user.user.id,
      theme: settings.theme,
      notifications: settings.notifications,
      notification_timing: settings.notificationTiming,
      dietary: settings.dietary,
      updated_at: new Date().toISOString()
    };
    
    if (existingSettings) {
      // Update existing settings
      logger.debug(`Updating existing settings for user ${user.user.id}`);
      const { error: updateError } = await supabase
        .from('user_settings')
        .update(dbSettings)
        .eq('user_id', user.user.id);
      
      if (updateError) {
        logger.error('Error updating user settings:', updateError);
      }
    } else {
      // Insert new settings
      logger.debug(`Creating new settings for user ${user.user.id}`);
      const { error: insertError } = await supabase
        .from('user_settings')
        .insert([{
          ...dbSettings,
          created_at: new Date().toISOString()
        }]);
      
      if (insertError) {
        logger.error('Error inserting user settings:', insertError);
        
        // If we get a duplicate key error, try updating instead
        if (insertError.code === '23505') { // PostgreSQL unique violation code
          logger.debug('Duplicate key detected, trying update instead');
          const { error: fallbackError } = await supabase
            .from('user_settings')
            .update(dbSettings)
            .eq('user_id', user.user.id);
          
          if (fallbackError) {
            logger.error('Error in fallback update of user settings:', fallbackError);
          }
        }
      }
    }
  } catch (error) {
    logger.error('Error in saveUserSettings:', error);
  }
};
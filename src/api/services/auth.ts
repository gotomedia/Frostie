import { supabase } from './client';
import { migrateLocalDataToSupabase } from './migration';
import { logger } from "@/lib/logger";

// ==================== AUTH STATE CHANGE LISTENER ====================

export const setupAuthListener = (
  callback: (session: any | null) => void
) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      logger.debug("Auth state changed:", event, session ? "Session found" : "No session");
      callback(session);
    }
  );

  // Return the subscription to unsubscribe later
  return subscription;
};

// Function to manually set session from URL parameters
export const handleAuthRedirect = async (): Promise<boolean> => {
  // Check if we have a hash fragment that contains tokens
  if (window.location.hash && window.location.hash.includes('access_token')) {
    try {
      logger.debug('Auth redirect detected, attempting to set session...');
      
      // Supabase should automatically handle the hash, but we can manually trigger it
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        logger.error('Error retrieving session after redirect:', error);
        return false;
      }
      
      if (data.session) {
        logger.debug('Session successfully established after redirect');
        return true;
      } else {
        logger.debug('No session found after redirect processing');
      }
    } catch (err) {
      logger.error('Error handling auth redirect:', err);
    } finally {
      // Remove hash to clean up the URL regardless of outcome
      window.location.hash = '';
    }
  }
  
  return false;
};

// ==================== AUTHENTICATION FUNCTIONS ====================

export const signInWithGoogle = async (): Promise<void> => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin,
    }
  });
  
  if (error) {
    logger.error('Error signing in with Google:', error);
    throw error;
  }
};

export const signInWithEmail = async (email: string, password: string): Promise<void> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    logger.error('Error signing in with email:', error);
    throw error;
  }
  
  // After successful sign-in, migrate local data
  await migrateLocalDataToSupabase();
};

export const signUp = async (email: string, password: string): Promise<void> => {
  logger.debug(`Attempting to sign up with email: ${email}`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
    }
  });
  
  if (error) {
    logger.error('Error signing up:', error);
    throw error;
  }

  logger.debug('Sign up result:', data);
  
  // In Supabase, signUp doesn't automatically sign in the user if email confirmation is required
  if (data.session) {
    logger.debug('Session created, user is signed in');
    // After successful sign-up with immediate session, migrate local data
    await migrateLocalDataToSupabase();
  } else if (data.user) {
    logger.debug('User created but needs email confirmation');
    // User needs to confirm email
  }
};

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    logger.error('Error signing out:', error);
    throw error;
  }

  localStorage.removeItem('dataAlreadyMigrated');
  
  // Force reload the page to reset all app state
  window.location.href = '/';
};

export const getCurrentUser = async (): Promise<{ id: string; email: string } | null> => {
  const { data, error } = await supabase.auth.getUser();
  
  if (error || !data.user) {
    return null;
  }
  
  return {
    id: data.user.id,
    email: data.user.email || ''
  };
};
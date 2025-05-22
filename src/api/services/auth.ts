import { supabase } from './client';
import { migrateLocalDataToSupabase } from './migration';

// ==================== AUTH STATE CHANGE LISTENER ====================

export const setupAuthListener = (
  callback: (session: any | null) => void
) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (event, session) => {
      console.log("Auth state changed:", event, session ? "Session found" : "No session");
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
      console.log('Auth redirect detected, attempting to set session...');
      
      // Supabase should automatically handle the hash, but we can manually trigger it
      const { data, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error retrieving session after redirect:', error);
        return false;
      }
      
      if (data.session) {
        console.log('Session successfully established after redirect');
        return true;
      } else {
        console.log('No session found after redirect processing');
      }
    } catch (err) {
      console.error('Error handling auth redirect:', err);
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
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export const signInWithEmail = async (email: string, password: string): Promise<void> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    console.error('Error signing in with email:', error);
    throw error;
  }
  
  // After successful sign-in, migrate local data
  await migrateLocalDataToSupabase();
};

export const signUp = async (email: string, password: string): Promise<void> => {
  console.log(`Attempting to sign up with email: ${email}`);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
    }
  });
  
  if (error) {
    console.error('Error signing up:', error);
    throw error;
  }

  console.log('Sign up result:', data);
  
  // In Supabase, signUp doesn't automatically sign in the user if email confirmation is required
  if (data.session) {
    console.log('Session created, user is signed in');
    // After successful sign-up with immediate session, migrate local data
    await migrateLocalDataToSupabase();
  } else if (data.user) {
    console.log('User created but needs email confirmation');
    // User needs to confirm email
  }
};

export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    console.error('Error signing out:', error);
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
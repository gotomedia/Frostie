import React, { createContext, useEffect, useState } from 'react';
import { supabase, setupAuthListener, migrateLocalDataToSupabase } from '../api/supabase';
import { logger } from "@/lib/logger";

interface AuthContextType {
  user: any | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  error: null,
  signIn: async () => {},
  signUp: async () => {},
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for initial session and set up auth listener
  useEffect(() => {
    const checkSession = async () => {
      try {
        setIsLoading(true);
        
        // Get initial session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        if (data?.session) {
          logger.debug('Active session found:', data.session.user.id);
          setUser(data.session.user);
          
          // Migrate local data if this is the first sign-in
          if (!localStorage.getItem('dataAlreadyMigrated')) {
            await migrateLocalDataToSupabase();
            localStorage.setItem('dataAlreadyMigrated', 'true');
          }
        } else {
          logger.debug('No active session found');
        }
      } catch (error) {
        logger.error('Error checking session:', error);
        setError((error as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    // Set up auth state listener
    const subscription = setupAuthListener((session) => {
      logger.debug('Auth state change detected:', session?.user?.id);
      setUser(session?.user || null);
      
      // If user just signed in, migrate local data
      if (session?.user && !localStorage.getItem('dataAlreadyMigrated')) {
        migrateLocalDataToSupabase()
          .then(() => {
            localStorage.setItem('dataAlreadyMigrated', 'true');
          });
      }
    });

    checkSession();

    // Clean up subscription
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw error;
      }
      
      setUser(data.user);
    } catch (error) {
      logger.error('Error signing in:', error);
      setError((error as Error).message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
        }
      });
      
      if (error) {
        throw error;
      }
      
      // In Supabase, signUp doesn't automatically sign in the user if email confirmation is required
      // So we'll check if there's a session
      if (data.session) {
        setUser(data.user);
      } else {
        // Email confirmation is required
        logger.debug('Email confirmation required');
      }
    } catch (error) {
      logger.error('Error signing up:', error);
      setError((error as Error).message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      
      if (error) {
        throw error;
      }
      
      // The user will be redirected to Google for authentication
      // The auth state listener will update the user state when they return
    } catch (error) {
      logger.error('Error signing in with Google:', error);
      setError((error as Error).message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      setUser(null);
      localStorage.removeItem('dataAlreadyMigrated');
      
      // Force reload the page to reset all app state
      window.location.href = '/';
    } catch (error) {
      logger.error('Error signing out:', error);
      setError((error as Error).message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
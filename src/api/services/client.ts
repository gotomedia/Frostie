import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from "@/lib/logger";

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  logger.error('Missing Supabase environment variables. Make sure to set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env file.');
}

// Log URL for debugging
logger.debug('Supabase URL from env:', supabaseUrl);

// Create the Supabase client instance
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Create an enhanced client that includes the URL and key as properties for easier access
export const supabase = Object.assign(supabaseClient, {
  supabaseUrl,
  supabaseKey: supabaseAnonKey
});

export const initSupabase = (): SupabaseClient => {
  return supabase;
};
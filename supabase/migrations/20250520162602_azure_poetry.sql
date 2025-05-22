/*
  # Remove expiration_days column from user_settings

  1. Changes
    - Remove the `expiration_days` column from the `user_settings` table
    - Now we'll use a hardcoded 30-day fallback in the application
    - This simplifies the user interface and application logic
*/

-- First, check if the column exists before trying to drop it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'user_settings' 
      AND column_name = 'expiration_days'
  ) THEN
    -- Drop the column safely if it exists
    ALTER TABLE public.user_settings DROP COLUMN expiration_days;
  END IF;
END $$;
/*
  # Drop parsing trigger and function
  
  1. Changes
    - Drop the parse_expiry_date_trigger from freezer_items table
    - Drop the parse_expiration_date function
  
  2. Reason
    - Trigger wasn't correctly parsing expiration dates from text input
*/

-- Drop the trigger first
DROP TRIGGER IF EXISTS parse_expiry_date_trigger ON public.freezer_items;

-- Then drop the function
DROP FUNCTION IF EXISTS public.parse_expiration_date();
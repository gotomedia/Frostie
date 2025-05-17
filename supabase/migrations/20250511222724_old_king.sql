/*
  # Add size column to freezer_items table
  
  1. Changes
     - Add a `size` column to the `freezer_items` table
     - This allows storing the size/weight information separately from quantity
     - For example: quantity = 2, size = "8oz" for "2 8oz salmon fillets"
     - Default value is an empty string
*/

-- Add size column to the freezer_items table
ALTER TABLE public.freezer_items 
ADD COLUMN IF NOT EXISTS size text DEFAULT '';
/*
  # Add image_url column to freezer_items table
  
  1. Changes
     - Add an `image_url` column to the `freezer_items` table
     - This allows storing URLs to images of the freezer items
     - Default value is an empty string
*/

-- Add image_url column to the freezer_items table
ALTER TABLE public.freezer_items 
ADD COLUMN IF NOT EXISTS image_url text DEFAULT '';
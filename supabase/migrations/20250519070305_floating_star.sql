/*
  # Add image_url to freezer_items table

  1. Changes
    - Add `image_url` column to the `freezer_items` table to store image URLs for items
    - This allows users to associate images with their freezer items
    - Default to empty string for backward compatibility with existing items
*/

-- Add image_url column to the freezer_items table
ALTER TABLE public.freezer_items 
ADD COLUMN IF NOT EXISTS image_url text DEFAULT '';
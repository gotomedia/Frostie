/*
  # Add category column to shopping_items table

  1. Changes
     - Add a `category` column to the `shopping_items` table
     - This allows organizing shopping items by category (e.g., Produce, Dairy, etc.)
     - Default value is 'Other' for backward compatibility with existing items
     - Column is nullable to maintain compatibility with existing code

  2. Purpose
     - This migration fixes an error with adding shopping items when signed in
     - The frontend code expected a category column but it was missing in the schema
*/

-- Add category column to the shopping_items table
ALTER TABLE public.shopping_items 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'Other';
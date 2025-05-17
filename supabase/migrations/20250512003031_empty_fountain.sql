-- Add size column to the freezer_items table
ALTER TABLE public.freezer_items 
ADD COLUMN IF NOT EXISTS size text DEFAULT '';
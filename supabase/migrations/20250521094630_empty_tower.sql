/*
  # Fix RLS policies for freezer_items and shopping_items tables

  1. Changes
     - Drop any existing policies that might be conflicting
     - Add comprehensive RLS policies for freezer_items table
     - Add comprehensive RLS policies for shopping_items table
     - Ensure users can only access their own data

  2. Security
     - Enable RLS on freezer_items and shopping_items tables
     - Create policies for authenticated users to manage their own items
*/

-- First, ensure RLS is enabled on both tables
ALTER TABLE public.freezer_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can manage their own freezer items" ON public.freezer_items;
DROP POLICY IF EXISTS "Users can view and manage their own freezer items" ON public.freezer_items;
DROP POLICY IF EXISTS "Users can manage their own shopping items" ON public.freezer_items;
DROP POLICY IF EXISTS "Users can view and manage their own shopping items" ON public.shopping_items;

-- Create comprehensive policies for freezer_items
CREATE POLICY "Users can view and manage their own freezer items"
ON public.freezer_items
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create comprehensive policies for shopping_items
CREATE POLICY "Users can view and manage their own shopping items"
ON public.shopping_items
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
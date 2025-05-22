/*
  # Fix RLS policies for meal ideas

  1. Changes
    - Drop existing INSERT, UPDATE, and DELETE policies for meal_ideas
    - Create new, properly configured policies with correct user_id checks
    - Add user_id column to meal_ideas table if it doesn't exist
    - Allow anonymous users to read meal ideas but only authenticated users to modify them
*/

-- First, make sure the user_id column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'meal_ideas'
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.meal_ideas ADD COLUMN user_id uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can create meal ideas" ON public.meal_ideas;
DROP POLICY IF EXISTS "Authenticated users can update meal ideas" ON public.meal_ideas;
DROP POLICY IF EXISTS "Authenticated users can delete meal ideas" ON public.meal_ideas;
DROP POLICY IF EXISTS "Anyone can read meal ideas" ON public.meal_ideas;

-- Create SELECT policy for both anonymous and authenticated users
CREATE POLICY "Anyone can read meal ideas"
ON public.meal_ideas 
FOR SELECT
TO anon, authenticated;

-- Create INSERT policy that requires user_id to match authenticated user
CREATE POLICY "Authenticated users can create meal ideas"
ON public.meal_ideas
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Create UPDATE policy that requires user_id to match authenticated user
CREATE POLICY "Authenticated users can update meal ideas"
ON public.meal_ideas
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create DELETE policy that requires user_id to match authenticated user
CREATE POLICY "Authenticated users can delete meal ideas"
ON public.meal_ideas
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
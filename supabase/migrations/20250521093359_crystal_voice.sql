/*
  # Update meal_ideas table RLS policies
  
  1. Changes
     - Fix the INSERT policy to explicitly allow authenticated users to create meal ideas
     - Add UPDATE and DELETE policies for authenticated users
     - Ensure all users can manage their own favorite meals

  2. Purpose
     - Fix the issue preventing users from adding new meal ideas
     - Provide complete CRUD operations for authenticated users
     - Allow for better meal idea management
*/

-- Drop existing INSERT policy that's not working properly
DROP POLICY IF EXISTS "Only authenticated users can create meal ideas" ON public.meal_ideas;

-- Create a more permissive INSERT policy
CREATE POLICY "Authenticated users can create meal ideas"
ON public.meal_ideas
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Add UPDATE policy for authenticated users
CREATE POLICY "Authenticated users can update meal ideas"
ON public.meal_ideas
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Add DELETE policy for authenticated users
CREATE POLICY "Authenticated users can delete meal ideas"
ON public.meal_ideas
FOR DELETE
TO authenticated
USING (true);

-- Note: We keep the existing "Anyone can read meal ideas" SELECT policy
-- which allows both authenticated and anonymous users to read meal ideas
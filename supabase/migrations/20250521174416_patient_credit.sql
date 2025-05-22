/*
  # Add cooking_time column to meal_ideas table

  1. Changes
    - Add `cooking_time` column to the `meal_ideas` table
    - Set it as NOT NULL with a default value of empty text
    - This is needed to satisfy the constraint in the database

  2. Purpose
    - Fix the issue with the null value constraint violation when adding meal ideas
*/

-- Add cooking_time column to the meal_ideas table with a default value
ALTER TABLE public.meal_ideas 
ADD COLUMN IF NOT EXISTS cooking_time text NOT NULL DEFAULT '';

-- Update any existing rows with null cooking_time
UPDATE public.meal_ideas
SET cooking_time = ''
WHERE cooking_time IS NULL;
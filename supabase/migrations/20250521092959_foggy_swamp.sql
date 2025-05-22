/*
  # Add dietary preference columns to meal_ideas table

  1. Changes
    - Add `vegetarian` (boolean) column to allow filtering by vegetarian meals
    - Add `vegan` (boolean) column to allow filtering by vegan meals
    - Add `gluten_free` (boolean) column to allow filtering by gluten-free meals
    - Add `dairy_free` (boolean) column to allow filtering by dairy-free meals
    - Add `favorite` (boolean) column to allow users to mark meals as favorites
    - Set default values to false for backward compatibility with existing data
*/

-- Add missing columns to the meal_ideas table
ALTER TABLE public.meal_ideas
ADD COLUMN IF NOT EXISTS vegetarian boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS vegan boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS gluten_free boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS dairy_free boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS favorite boolean DEFAULT false;
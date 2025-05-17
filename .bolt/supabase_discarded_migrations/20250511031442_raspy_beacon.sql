/*
  # Create meal plans table

  1. New Tables
    - `meal_plans`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users.id)
      - `title` (text, not null)
      - `date` (date, not null)
      - `meal_type` (text, not null) - breakfast, lunch, dinner, snack
      - `meal_idea_id` (uuid, foreign key to meal_ideas.id, nullable)
      - `notes` (text, nullable)
      - `created_at` (timestamp with time zone, default now())
      - `updated_at` (timestamp with time zone, default now())
  
  2. New Tables
    - `meal_plan_items`
      - `id` (uuid, primary key)
      - `meal_plan_id` (uuid, foreign key to meal_plans.id)
      - `freezer_item_id` (uuid, foreign key to freezer_items.id, nullable)
      - `item_name` (text, not null) - can be a freezer item or a custom item
      - `quantity` (text, nullable)
      - `created_at` (timestamp with time zone, default now())
  
  3. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own meal plans
*/

-- Create meal_plans table
CREATE TABLE IF NOT EXISTS meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  title text NOT NULL,
  date date NOT NULL,
  meal_type text NOT NULL,
  meal_idea_id uuid REFERENCES meal_ideas(id),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create meal_plan_items table
CREATE TABLE IF NOT EXISTS meal_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id uuid REFERENCES meal_plans(id) NOT NULL,
  freezer_item_id uuid REFERENCES freezer_items(id),
  item_name text NOT NULL,
  quantity text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_items ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own meal plans
CREATE POLICY "Users can manage their own meal plans"
  ON meal_plans
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policy for users to manage their own meal plan items
-- This policy uses a join to check that the meal plan belongs to the user
CREATE POLICY "Users can manage their own meal plan items"
  ON meal_plan_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans
      WHERE meal_plans.id = meal_plan_items.meal_plan_id
      AND meal_plans.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meal_plans
      WHERE meal_plans.id = meal_plan_items.meal_plan_id
      AND meal_plans.user_id = auth.uid()
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS meal_plans_user_id_idx ON meal_plans(user_id);
CREATE INDEX IF NOT EXISTS meal_plans_date_idx ON meal_plans(date);
CREATE INDEX IF NOT EXISTS meal_plan_items_meal_plan_id_idx ON meal_plan_items(meal_plan_id);
CREATE INDEX IF NOT EXISTS meal_plan_items_freezer_item_id_idx ON meal_plan_items(freezer_item_id);

-- Add trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_meal_plans_updated_at
BEFORE UPDATE ON meal_plans
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
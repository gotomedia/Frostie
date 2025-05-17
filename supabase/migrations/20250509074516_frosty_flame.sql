/*
  # Create user_settings table

  1. New Tables
    - `user_settings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users.id, unique)
      - `theme` (text, default 'system')
      - `notifications` (boolean, default true)
      - `expiration_days` (integer, default 30)
      - `dietary` (jsonb)
      - `created_at` (timestamp with time zone, default now())
      - `updated_at` (timestamp with time zone, default now())
  
  2. Security
    - Enable RLS on `user_settings` table
    - Add policy for authenticated users to manage their own settings
*/

-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) UNIQUE,
  theme text DEFAULT 'system',
  notifications boolean DEFAULT true,
  expiration_days integer DEFAULT 30,
  dietary jsonb DEFAULT '{"vegetarian": false, "vegan": false, "glutenFree": false, "dairyFree": false}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own settings
CREATE POLICY "Users can manage their own settings"
  ON user_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
/*
  # Fix date parsing in freezer items
  
  1. Changes
     - Creates a trigger function to parse relative dates from item names
     - Applies trigger to freezer_items table to automatically calculate expiration dates
     - Handles patterns like "in X days" and "good for X days/weeks/months"
     - Cleans up item names by removing date expressions
*/

-- Create or replace the function to properly parse dates
CREATE OR REPLACE FUNCTION public.parse_relative_dates()
RETURNS TRIGGER AS $$
DECLARE
  days_match TEXT;
  days_to_add INTEGER;
  amount_match TEXT;
  unit_match TEXT;
  amount INTEGER;
  interval_str TEXT;
BEGIN
  -- Check if the name contains an "in X days" pattern
  IF NEW.name ~ '\sin\s+\d+\s+days?\b' THEN
    -- Extract the number of days
    days_match := substring(NEW.name from '\sin\s+(\d+)\s+days?\b');
    days_to_add := CAST(substring(days_match from '\d+') AS INTEGER);
    
    -- Set the expiration date based on the extracted days
    NEW.expiry_date := CURRENT_TIMESTAMP + (days_to_add || ' days')::INTERVAL;
    
    -- Clean up the name by removing the "in X days" part
    NEW.name := regexp_replace(NEW.name, '\sin\s+\d+\s+days?\b', '');
  END IF;
  
  -- Check for "good for X days/weeks/months" pattern
  IF NEW.name ~ 'good\s+for\s+\d+\s+(day|days|week|weeks|month|months)\b' THEN
    -- Extract the amount and unit
    amount_match := substring(NEW.name from 'good\s+for\s+(\d+)');
    amount := CAST(substring(amount_match from '\d+') AS INTEGER);
    
    -- Extract the time unit
    unit_match := substring(NEW.name from 'good\s+for\s+\d+\s+(day|days|week|weeks|month|months)\b');
    
    -- Determine the interval string
    IF unit_match LIKE 'day%' THEN
      interval_str := amount || ' days';
    ELSIF unit_match LIKE 'week%' THEN
      interval_str := (amount * 7) || ' days';
    ELSIF unit_match LIKE 'month%' THEN
      interval_str := amount || ' months';
    ELSE
      interval_str := amount || ' days'; -- Default to days
    END IF;
    
    -- Set the expiration date
    NEW.expiry_date := CURRENT_TIMESTAMP + interval_str::INTERVAL;
    
    -- Clean up the name
    NEW.name := regexp_replace(NEW.name, 'good\s+for\s+\d+\s+(day|days|week|weeks|month|months)\b', '');
  END IF;
  
  -- Remove any trailing "of" or prepositions
  NEW.name := regexp_replace(NEW.name, '\s+(of|in|for|on)$', '');
  
  -- Trim any excess whitespace
  NEW.name := trim(both from NEW.name);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger on the freezer_items table
DROP TRIGGER IF EXISTS freezer_items_date_parser ON public.freezer_items;

CREATE TRIGGER freezer_items_date_parser
BEFORE INSERT OR UPDATE ON public.freezer_items
FOR EACH ROW
EXECUTE FUNCTION public.parse_relative_dates();

-- Add a comment to the trigger for documentation
COMMENT ON TRIGGER freezer_items_date_parser ON public.freezer_items 
IS 'Parses relative dates from natural language inputs and cleans up item names';
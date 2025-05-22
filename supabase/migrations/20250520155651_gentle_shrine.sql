/*
  # Add notification_timing column to user_settings table

  1. Changes
    - Add `notification_timing` column to the `user_settings` table
    - This allows users to specify when they want to receive notifications before items expire
    - Default value is 3 days before expiration
    - Added as part of enhancing notification preferences

  2. Purpose
    - Provide more granular control over when users receive expiration notifications
    - Support values: 3 (default), 7, 14, 30 days before expiration
*/

-- Add notification_timing column to the user_settings table
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS notification_timing integer DEFAULT 3;

-- Add a comment to explain the column purpose
COMMENT ON COLUMN public.user_settings.notification_timing IS 'Number of days before expiration to send notification. Default is 3 days.';
-- Run this in your Supabase SQL Editor to fix the schema errors

-- Add services column for clubs (array of strings)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS services text[] DEFAULT '{}';

-- Add last_payment_date column for commission tracking
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_payment_date timestamp with time zone;

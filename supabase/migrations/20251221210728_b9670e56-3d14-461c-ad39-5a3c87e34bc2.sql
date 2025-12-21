-- Add sidebar_color column to entities table for custom menu color
ALTER TABLE public.entities 
ADD COLUMN IF NOT EXISTS sidebar_color text;
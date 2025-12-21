-- Create enum for client types
CREATE TYPE public.client_type AS ENUM ('standard', 'vip', 'premium');

-- Add client_type column to clients table
ALTER TABLE public.clients 
ADD COLUMN client_type public.client_type NOT NULL DEFAULT 'standard';
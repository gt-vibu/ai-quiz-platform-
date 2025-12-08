-- Add boosters column to participants table
ALTER TABLE public.participants 
ADD COLUMN IF NOT EXISTS boosters jsonb DEFAULT '[]'::jsonb;
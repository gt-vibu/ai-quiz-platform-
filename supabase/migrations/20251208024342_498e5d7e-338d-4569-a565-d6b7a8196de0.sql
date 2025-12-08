-- Add boosters_enabled column to quizzes table
ALTER TABLE public.quizzes ADD COLUMN boosters_enabled boolean DEFAULT true;
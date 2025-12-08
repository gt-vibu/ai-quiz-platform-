-- Add difficulty, timer, and points columns to questions table
ALTER TABLE public.questions 
ADD COLUMN difficulty text CHECK (difficulty IN ('easy', 'medium', 'hard')),
ADD COLUMN points integer DEFAULT 1,
ADD COLUMN time_limit integer DEFAULT 30;

-- Add difficulty and timer settings to quizzes table
ALTER TABLE public.quizzes
ADD COLUMN difficulty_mode text DEFAULT 'medium',
ADD COLUMN timer_per_question integer DEFAULT 30;

-- Update participants table to store detailed answer data
ALTER TABLE public.participants
ADD COLUMN answer_details jsonb DEFAULT '[]'::jsonb,
ADD COLUMN total_time_spent integer DEFAULT 0;

-- Create index for better query performance
CREATE INDEX idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX idx_participants_quiz_score ON public.participants(quiz_id, score DESC);
-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  age_category TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Add new columns to quizzes table
ALTER TABLE public.quizzes 
  ADD COLUMN IF NOT EXISTS has_timer BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS total_quiz_time INTEGER,
  ADD COLUMN IF NOT EXISTS age_category TEXT,
  ADD COLUMN IF NOT EXISTS pdf_source TEXT;

-- Add new columns to questions table
ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS subtopic TEXT;

-- Add user_id to participants table
ALTER TABLE public.participants
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create quiz_stats table
CREATE TABLE IF NOT EXISTS public.quiz_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  total_participants INTEGER DEFAULT 0,
  highest_score INTEGER DEFAULT 0,
  lowest_score INTEGER DEFAULT 0,
  average_score NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(quiz_id)
);

-- Enable RLS on quiz_stats
ALTER TABLE public.quiz_stats ENABLE ROW LEVEL SECURITY;

-- RLS policies for quiz_stats
DROP POLICY IF EXISTS "Anyone can view quiz stats" ON public.quiz_stats;
CREATE POLICY "Anyone can view quiz stats" ON public.quiz_stats
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "System can insert quiz stats" ON public.quiz_stats;
CREATE POLICY "System can insert quiz stats" ON public.quiz_stats
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "System can update quiz stats" ON public.quiz_stats;
CREATE POLICY "System can update quiz stats" ON public.quiz_stats
  FOR UPDATE USING (true);

-- Function to update quiz statistics
CREATE OR REPLACE FUNCTION update_quiz_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.quiz_stats (quiz_id, total_participants, highest_score, lowest_score, average_score)
  VALUES (
    NEW.quiz_id,
    1,
    NEW.score,
    NEW.score,
    NEW.score
  )
  ON CONFLICT (quiz_id) DO UPDATE SET
    total_participants = quiz_stats.total_participants + 1,
    highest_score = GREATEST(quiz_stats.highest_score, NEW.score),
    lowest_score = LEAST(quiz_stats.lowest_score, NEW.score),
    average_score = (quiz_stats.average_score * quiz_stats.total_participants + NEW.score) / (quiz_stats.total_participants + 1),
    updated_at = now();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update quiz stats when participant completes quiz
DROP TRIGGER IF EXISTS update_quiz_stats_trigger ON public.participants;
CREATE TRIGGER update_quiz_stats_trigger
  AFTER INSERT OR UPDATE OF completed, score ON public.participants
  FOR EACH ROW
  WHEN (NEW.completed = true)
  EXECUTE FUNCTION update_quiz_stats();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, age_category)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'age_category'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  topic TEXT NOT NULL,
  question_count INTEGER NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('multiple_choice', 'open_ended')),
  question TEXT NOT NULL,
  options JSONB,
  correct_answer TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create participants table for tracking who joined
CREATE TABLE public.participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  score INTEGER DEFAULT 0,
  answers JSONB DEFAULT '[]'::jsonb,
  completed BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quizzes (public read, anyone can create)
CREATE POLICY "Anyone can view quizzes" 
ON public.quizzes 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create quizzes" 
ON public.quizzes 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for questions (public read)
CREATE POLICY "Anyone can view questions" 
ON public.questions 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can create questions" 
ON public.questions 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for participants (public read/write)
CREATE POLICY "Anyone can view participants" 
ON public.participants 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can join as participant" 
ON public.participants 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update their participation" 
ON public.participants 
FOR UPDATE 
USING (true);

-- Create function for updating timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates on quizzes
CREATE TRIGGER update_quizzes_updated_at
BEFORE UPDATE ON public.quizzes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for participants table
ALTER TABLE public.participants REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, difficulty, timerPerQuestion, boostersEnabled, questions } = await req.json();
    console.log('Creating quiz:', { topic, difficulty, timerPerQuestion, boostersEnabled, questionCount: questions?.length });

    if (!topic || !questions || questions.length === 0) {
      throw new Error('Missing required fields: topic or questions');
    }

    // Generate unique 6-character code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    console.log('Generated code:', code);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        code,
        topic,
        question_count: questions.length,
        difficulty_mode: difficulty || 'medium',
        timer_per_question: timerPerQuestion || 30,
        boosters_enabled: boostersEnabled !== false,
      })
      .select()
      .single();

    if (quizError) {
      console.error('Quiz creation error:', quizError);
      throw new Error(`Failed to create quiz: ${quizError.message}`);
    }

    console.log('Quiz created:', quiz.id);

    // Calculate points based on difficulty
    const getPoints = (questionDifficulty: string) => {
      switch (questionDifficulty) {
        case 'hard': return 3;
        case 'medium': return 2;
        case 'easy': return 1;
        default: return 1;
      }
    };

    // Create questions
    const questionsToInsert = questions.map((q: any) => ({
      quiz_id: quiz.id,
      type: q.type || 'multiple_choice',
      question: q.question,
      options: q.options || null,
      correct_answer: q.correct_answer,
      difficulty: q.difficulty || difficulty || 'medium',
      points: getPoints(q.difficulty || difficulty || 'medium'),
      time_limit: timerPerQuestion || 30,
      topic: topic,
      subtopic: q.subtopic || null,
    }));

    const { error: questionsError } = await supabase
      .from('questions')
      .insert(questionsToInsert);

    if (questionsError) {
      console.error('Questions creation error:', questionsError);
      throw new Error(`Failed to create questions: ${questionsError.message}`);
    }

    console.log('Questions created successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        code,
        quizId: quiz.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-quiz:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred',
        success: false 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

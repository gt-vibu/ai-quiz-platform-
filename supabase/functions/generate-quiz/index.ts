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
    const { topic, questionCount, types, difficulty, timerPerQuestion } = await req.json();
    console.log('Generating quiz:', { topic, questionCount, types, difficulty, timerPerQuestion });

    if (!topic || !questionCount || !types) {
      throw new Error('Missing required fields: topic, questionCount, or types');
    }

    // Generate unique 6-character code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    console.log('Generated code:', code);
    
    // Determine difficulty distribution
    let difficultyPrompt = "";
    if (difficulty === "all") {
      const easyCount = Math.floor(questionCount / 3);
      const mediumCount = Math.floor(questionCount / 3);
      const hardCount = questionCount - easyCount - mediumCount;
      difficultyPrompt = `Generate ${easyCount} easy questions, ${mediumCount} medium questions, and ${hardCount} hard questions. Mark each question with its difficulty level (easy/medium/hard).`;
    } else {
      difficultyPrompt = `Generate ${questionCount} ${difficulty} difficulty questions.`;
    }

    // Get AI service key
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Prepare prompt for AI
    const includeMultipleChoice = types.includes('multiple_choice');
    const includeOpenEnded = types.includes('open_ended');
    
    let questionTypeInstructions = '';
    if (includeMultipleChoice && includeOpenEnded) {
      questionTypeInstructions = 'Mix of multiple choice (with 4 options) and open-ended questions.';
    } else if (includeMultipleChoice) {
      questionTypeInstructions = 'All multiple choice questions with 4 options each.';
    } else {
      questionTypeInstructions = 'All open-ended questions.';
    }

    const prompt = `Generate ${questionCount} quiz questions about "${topic}". ${difficultyPrompt} ${questionTypeInstructions}

Return ONLY a valid JSON array with this exact structure (no markdown, no extra text):
[
  {
    "type": "multiple_choice",
    "question": "What is...",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A",
    "difficulty": "easy|medium|hard"
  },
  {
    "type": "open_ended",
    "question": "Explain...",
    "correct_answer": "Expected answer here",
    "difficulty": "easy|medium|hard"
  }
]

Requirements:
- For multiple choice: provide exactly 4 options
- For open ended: provide a comprehensive correct answer
- Include difficulty level for each question (easy, medium, or hard)
- Make questions engaging and educational
- Return ONLY the JSON array, nothing else`;

    console.log('Calling AI with prompt');

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a quiz generation expert. Always return valid JSON arrays only, no markdown formatting.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI service error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');
    
    let content = aiData.choices[0].message.content.trim();
    
    // Remove markdown code blocks if present
    if (content.startsWith('```')) {
      content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }

    const questions = JSON.parse(content);
    console.log('Parsed questions:', questions.length);

    if (!Array.isArray(questions) || questions.length === 0) {
      throw new Error('Invalid questions format from AI');
    }

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
        question_count: questionCount,
        difficulty_mode: difficulty || 'medium',
        timer_per_question: timerPerQuestion || 30,
      })
      .select()
      .single();

    if (quizError) {
      console.error('Quiz creation error:', quizError);
      throw new Error(`Failed to create quiz: ${quizError.message}`);
    }

    console.log('Quiz created:', quiz.id);

    // Create questions
    const questionsToInsert = questions.map((q: any) => {
      const questionDifficulty = q.difficulty || difficulty || 'medium';
      let points = 1;
      if (difficulty === "all") {
        points = questionDifficulty === "hard" ? 3 : questionDifficulty === "medium" ? 2 : 1;
      }
      
      return {
        quiz_id: quiz.id,
        type: q.type,
        question: q.question,
        options: q.options || null,
        correct_answer: q.correct_answer,
        difficulty: questionDifficulty,
        points: points,
        time_limit: timerPerQuestion || 30,
      };
    });

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
    console.error('Error in generate-quiz:', error);
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
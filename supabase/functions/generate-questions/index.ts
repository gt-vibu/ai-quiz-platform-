import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, questionCount, difficulty, optionCount } = await req.json();
    console.log('Generating questions:', { topic, questionCount, difficulty, optionCount });

    if (!topic || !questionCount) {
      throw new Error('Missing required fields: topic or questionCount');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Prepare prompt for AI
    const prompt = `Generate ${questionCount} quiz questions about "${topic}" with ${difficulty} difficulty.

Return ONLY a valid JSON array with this exact structure (no markdown, no extra text):
[
  {
    "type": "multiple_choice",
    "question": "What is...",
    "options": [${Array(optionCount || 4).fill('"Option"').join(', ')}],
    "correct_answer": "Option 1",
    "difficulty": "${difficulty}",
    "topic": "${topic}",
    "subtopic": "specific subtopic this question covers"
  }
]

Requirements:
- Provide exactly ${optionCount || 4} options for each question
- All questions should be multiple choice
- Include a subtopic field that describes the specific area within the main topic
- Make questions engaging and educational
- Ensure correct_answer matches one of the options exactly
- Return ONLY the JSON array, nothing else`;

    console.log('Calling AI with prompt');

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
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add more credits." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
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

    return new Response(
      JSON.stringify({ questions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-questions:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'An unknown error occurred' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

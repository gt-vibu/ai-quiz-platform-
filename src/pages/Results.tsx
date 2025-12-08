import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, Clock, Target, Home, Award, Users, BarChart3, Zap, TrendingUp, TrendingDown } from "lucide-react";
import { TopicAnalysis } from "@/components/results/TopicAnalysis";
import { PerformanceCharts } from "@/components/results/PerformanceCharts";

interface Question {
  id: string;
  question: string;
  correct_answer: string;
  difficulty: string;
  points: number;
  topic?: string;
  subtopic?: string;
}

interface AnswerDetail {
  question_id: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  time_spent: number;
  difficulty: string;
  points: number;
}

interface QuizStats {
  total_participants: number;
  highest_score: number;
  lowest_score: number;
  average_score: number;
}

interface Quiz {
  topic: string;
  difficulty_mode: string;
  timer_per_question: number;
}

const Results = () => {
  const { code, participantId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [participant, setParticipant] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answerDetails, setAnswerDetails] = useState<AnswerDetail[]>([]);
  const [quizStats, setQuizStats] = useState<QuizStats | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    fetchResults();
  }, [code, participantId]);

  const fetchResults = async () => {
    try {
      // Fetch participant data
      const { data: participantData, error: participantError } = await supabase
        .from("participants")
        .select("*")
        .eq("id", participantId)
        .single();

      if (participantError) throw participantError;

      // Fetch quiz to get questions and details
      const { data: quizData } = await supabase
        .from("quizzes")
        .select("id, topic, difficulty_mode, timer_per_question")
        .eq("code", code)
        .single();

      if (quizData) {
        setQuiz(quizData);
        
        const { data: questionsData } = await supabase
          .from("questions")
          .select("*")
          .eq("quiz_id", quizData.id)
          .order("created_at");

        setQuestions(questionsData || []);

        // Fetch quiz stats
        const { data: statsData } = await supabase
          .from("quiz_stats")
          .select("*")
          .eq("quiz_id", quizData.id)
          .single();

        if (statsData) {
          setQuizStats(statsData);
        }
      }

      setParticipant(participantData);
      const details = participantData.answer_details as any[];
      setAnswerDetails(Array.isArray(details) ? details : []);
    } catch (error) {
      console.error("Error fetching results:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const correctAnswers = answerDetails.filter((a) => a.is_correct).length;
  const wrongAnswers = answerDetails.filter((a) => !a.is_correct && a.user_answer).length;
  const skippedQuestions = questions.length - correctAnswers - wrongAnswers;
  
  // Calculate total possible points
  const totalPossiblePoints = questions.reduce((sum, q) => sum + q.points, 0);
  
  // Calculate accuracy
  const attemptedQuestions = correctAnswers + wrongAnswers;
  const accuracy = attemptedQuestions > 0 ? ((correctAnswers / attemptedQuestions) * 100).toFixed(1) : "0.0";
  
  // Calculate rank (position among all participants)
  const rank = quizStats && participant ? 
    quizStats.total_participants - Math.floor((participant.score / (quizStats.highest_score || 1)) * (quizStats.total_participants - 1)) 
    : 0;

  // Calculate time spent on correct, incorrect, and skipped
  const timeOnCorrect = answerDetails.filter(a => a.is_correct).reduce((sum, a) => sum + a.time_spent, 0);
  const timeOnIncorrect = answerDetails.filter(a => !a.is_correct && a.user_answer).reduce((sum, a) => sum + a.time_spent, 0);
  const totalTimeSpent = participant?.total_time_spent || 0;
  const timeOnSkipped = totalTimeSpent - timeOnCorrect - timeOnIncorrect;
  
  const timeCorrectPercent = totalTimeSpent > 0 ? ((timeOnCorrect / totalTimeSpent) * 100).toFixed(1) : "0";
  const timeIncorrectPercent = totalTimeSpent > 0 ? ((timeOnIncorrect / totalTimeSpent) * 100).toFixed(1) : "0";
  const timeSkippedPercent = totalTimeSpent > 0 ? ((timeOnSkipped / totalTimeSpent) * 100).toFixed(1) : "0";
  
  // Calculate time by difficulty
  const timeByDifficulty = answerDetails.reduce((acc, detail) => {
    const diff = detail.difficulty || "medium";
    acc[diff] = (acc[diff] || 0) + detail.time_spent;
    return acc;
  }, {} as Record<string, number>);

  // Calculate performance by difficulty
  const performanceByDifficulty = answerDetails.reduce((acc, detail) => {
    const diff = detail.difficulty || "medium";
    if (!acc[diff]) acc[diff] = { correct: 0, total: 0 };
    acc[diff].total++;
    if (detail.is_correct) acc[diff].correct++;
    return acc;
  }, {} as Record<string, { correct: number; total: number }>);

  // Identify strengths and weaknesses by topic/subtopic
  const performanceByTopic = answerDetails.reduce((acc, detail) => {
    const question = questions.find(q => q.id === detail.question_id);
    const topic = question?.topic || "General";
    if (!acc[topic]) acc[topic] = { correct: 0, total: 0 };
    acc[topic].total++;
    if (detail.is_correct) acc[topic].correct++;
    return acc;
  }, {} as Record<string, { correct: number; total: number }>);

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  Object.entries(performanceByTopic).forEach(([topic, stats]) => {
    const percentage = (stats.correct / stats.total) * 100;
    if (percentage >= 70) {
      strengths.push(`${topic} (${percentage.toFixed(0)}% correct)`);
    } else if (percentage < 50) {
      weaknesses.push(`${topic} (${percentage.toFixed(0)}% correct)`);
    }
  });

  // Fallback to difficulty-based analysis if no topics
  if (strengths.length === 0 && weaknesses.length === 0) {
    Object.entries(performanceByDifficulty).forEach(([difficulty, stats]) => {
      const percentage = (stats.correct / stats.total) * 100;
      if (percentage >= 70) {
        strengths.push(`${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} questions (${percentage.toFixed(0)}% correct)`);
      } else if (percentage < 50) {
        weaknesses.push(`${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} questions (${percentage.toFixed(0)}% correct)`);
      }
    });
  }

  // Calculate peer comparison metrics
  const topperAccuracy = quizStats && quizStats.highest_score > 0 ? 
    ((quizStats.highest_score / totalPossiblePoints) * 100).toFixed(1) : "0.0";
  const avgAccuracy = quizStats && quizStats.average_score > 0 ?
    ((quizStats.average_score / totalPossiblePoints) * 100).toFixed(1) : "0.0";

  return (
    <div className="min-h-screen p-4 md:p-8 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 pointer-events-none" />
      
      <div className="max-w-6xl mx-auto relative">
        <Card className="p-8 backdrop-blur-sm border-primary/30 shadow-lg shadow-primary/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent mb-4 animate-glow">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
              Comprehensive Quiz Report
            </h1>
            <p className="text-2xl text-foreground font-semibold">{participant?.name}</p>
            <p className="text-3xl text-primary font-bold mt-2">Score: {participant?.score}/{totalPossiblePoints} points</p>
            {rank > 0 && <p className="text-lg text-muted-foreground">Rank: #{rank} out of {quizStats?.total_participants}</p>}
          </div>

          {/* I. Quiz Summary & Rules */}
          <Card className="p-6 mb-6 bg-card/50 border-primary/20">
            <h2 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
              <Award className="w-6 h-6 text-primary" />
              I. Quiz Summary & Rules
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Topic/Subject</p>
                <p className="text-lg font-semibold text-foreground">{quiz?.topic || "General Quiz"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Difficulty Level</p>
                <p className="text-lg font-semibold text-foreground capitalize">{quiz?.difficulty_mode || "Medium"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Questions</p>
                <p className="text-lg font-semibold text-foreground">{questions.length}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Marks</p>
                <p className="text-lg font-semibold text-foreground">{totalPossiblePoints}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Learners</p>
                <p className="text-lg font-semibold text-foreground">{quizStats?.total_participants || 1}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Time Per Question</p>
                <p className="text-lg font-semibold text-foreground">{quiz?.timer_per_question || 30}s</p>
              </div>
            </div>
          </Card>

          {/* II. Your Performance */}
          <Card className="p-6 mb-6 bg-card/50 border-primary/20">
            <h2 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
              <Target className="w-6 h-6 text-primary" />
              II. Your Performance
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Score</p>
                <p className="text-2xl font-bold text-primary">{participant?.score}/{totalPossiblePoints}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Accuracy</p>
                <p className="text-2xl font-bold text-green-500">{accuracy}%</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Rank</p>
                <p className="text-2xl font-bold text-accent">#{rank || 1}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Time Taken</p>
                <p className="text-2xl font-bold text-foreground">{Math.floor(totalTimeSpent / 60)}m {totalTimeSpent % 60}s</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="text-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-sm text-muted-foreground">Correct</p>
                <p className="text-xl font-bold text-green-500">{correctAnswers}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-muted-foreground">Incorrect</p>
                <p className="text-xl font-bold text-red-500">{wrongAnswers}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <p className="text-sm text-muted-foreground">Skipped</p>
                <p className="text-xl font-bold text-yellow-500">{skippedQuestions}</p>
              </div>
            </div>
          </Card>

          {/* III. Time Analysis */}
          <Card className="p-6 mb-6 bg-card/50 border-primary/20">
            <h2 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary" />
              III. Time Analysis
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Time on Correct Answers</span>
                  <span className="text-sm font-bold text-green-500">{timeCorrectPercent}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div 
                    className="bg-green-500 h-3 rounded-full transition-all"
                    style={{ width: `${timeCorrectPercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{Math.floor(timeOnCorrect / 60)}m {timeOnCorrect % 60}s</p>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Time on Incorrect Answers</span>
                  <span className="text-sm font-bold text-red-500">{timeIncorrectPercent}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div 
                    className="bg-red-500 h-3 rounded-full transition-all"
                    style={{ width: `${timeIncorrectPercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{Math.floor(timeOnIncorrect / 60)}m {timeOnIncorrect % 60}s</p>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Time on Skipped Questions</span>
                  <span className="text-sm font-bold text-yellow-500">{timeSkippedPercent}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div 
                    className="bg-yellow-500 h-3 rounded-full transition-all"
                    style={{ width: `${timeSkippedPercent}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{Math.floor(timeOnSkipped / 60)}m {timeOnSkipped % 60}s</p>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-border">
              <h3 className="font-semibold text-foreground mb-3">Time by Difficulty Level</h3>
              <div className="space-y-2">
                {Object.entries(timeByDifficulty).map(([difficulty, time]) => (
                  <div key={difficulty} className="flex justify-between items-center">
                    <span className="text-sm text-foreground capitalize">{difficulty} Questions</span>
                    <span className="text-sm font-semibold text-foreground">{Math.floor(time / 60)}m {time % 60}s</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>

          {/* IV. Peer Comparison */}
          {quizStats && (
            <Card className="p-6 mb-6 bg-card/50 border-primary/20">
              <h2 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                IV. Peer Comparison Data
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Topper Performance</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Topper Score</span>
                      <span className="text-sm font-bold text-accent">{quizStats.highest_score}/{totalPossiblePoints}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Topper Accuracy</span>
                      <span className="text-sm font-bold text-accent">{topperAccuracy}%</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Class Average</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Average Score</span>
                      <span className="text-sm font-bold text-primary">{quizStats.average_score.toFixed(1)}/{totalPossiblePoints}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Average Accuracy</span>
                      <span className="text-sm font-bold text-primary">{avgAccuracy}%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">Your Position: </span>
                  You scored {(participant?.score - quizStats.average_score).toFixed(1)} points 
                  {participant?.score >= quizStats.average_score ? " above" : " below"} the class average.
                  {participant?.score === quizStats.highest_score && " 🎉 Congratulations! You're the topper!"}
                </p>
              </div>
            </Card>
          )}

          {/* Analysis Section */}
          <Card className="p-6 mb-6 bg-card/50 border-primary/20">
            <h2 className="text-2xl font-bold mb-4 text-foreground flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              Detailed Analysis
            </h2>
            
            {/* Overall Score Breakdown */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">Overall Score Breakdown</h3>
              <div className="space-y-2">
                <p className="text-sm text-foreground">Marks Scored: <span className="font-bold text-primary">{participant?.score}</span></p>
                <p className="text-sm text-foreground">Marks Missed: <span className="font-bold text-red-500">{totalPossiblePoints - participant?.score}</span></p>
                <p className="text-sm text-foreground">Questions Attempted: <span className="font-bold">{attemptedQuestions}/{questions.length}</span></p>
              </div>
            </div>

            {/* Efficiency Report */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">Efficiency Report</h3>
              <p className="text-sm text-foreground mb-2">
                You spent {timeIncorrectPercent}% of your time on incorrect answers. 
                {parseInt(timeIncorrectPercent) > 30 && " Consider moving on faster from difficult questions."}
                {parseInt(timeCorrectPercent) > 50 && " Good time management on questions you answered correctly!"}
              </p>
              <p className="text-sm text-foreground">
                Average time per question: {Math.floor((totalTimeSpent / attemptedQuestions) || 0)}s
              </p>
            </div>

            {/* Key Takeaway */}
            <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
              <h3 className="text-lg font-semibold text-foreground mb-2">Key Takeaway</h3>
              <p className="text-sm text-foreground">
                {participant?.score >= (quizStats?.average_score || 0) 
                  ? `Great job! You performed above average. ` 
                  : `You can improve your performance. `}
                {weaknesses.length > 0 
                  ? `Focus on improving in: ${weaknesses.join(", ")}.` 
                  : "Keep up the excellent work across all areas!"}
                {parseInt(timeIncorrectPercent) > 30 && " Work on time management for challenging questions."}
              </p>
            </div>
          </Card>

          {/* Topic & Subtopic Analysis */}
          <div className="mb-6">
            <TopicAnalysis questions={questions} answerDetails={answerDetails} />
          </div>

          {/* Performance Charts */}
          <div className="mb-6">
            <PerformanceCharts
              questions={questions}
              answerDetails={answerDetails}
              correctAnswers={correctAnswers}
              wrongAnswers={wrongAnswers}
              skippedQuestions={skippedQuestions}
            />
          </div>

          {/* Boosters Used */}
          {participant?.boosters && (participant.boosters as any[]).length > 0 && (
            <Card className="p-6 mb-6 bg-card/50 border-primary/20">
              <h2 className="text-xl font-bold mb-4 text-foreground flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Power Boosters Used
              </h2>
              <div className="flex flex-wrap gap-2">
                {(participant.boosters as any[]).filter((b: any) => b.used).map((booster: any, idx: number) => (
                  <span 
                    key={idx} 
                    className="px-3 py-1 rounded-full bg-primary/20 text-primary text-sm"
                  >
                    {booster.type.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Detailed Question Review */}
          <Card className="p-6 bg-card/50 border-primary/20 mb-6">
            <h3 className="text-xl font-bold mb-4 text-foreground">Question-by-Question Review</h3>
            <div className="space-y-4">
              {questions.map((question, idx) => {
                const answer = answerDetails.find((a) => a.question_id === question.id);
                return (
                  <div key={question.id} className={`p-4 rounded-lg border ${
                    !answer ? "border-yellow-500/30 bg-yellow-500/5" :
                    answer.is_correct ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-semibold text-foreground">Q{idx + 1}. {question.question}</p>
                      <span className={`text-xs px-2 py-1 rounded ${
                        question.difficulty === "hard" ? "bg-red-500/20 text-red-500" :
                        question.difficulty === "medium" ? "bg-yellow-500/20 text-yellow-500" :
                        "bg-green-500/20 text-green-500"
                      }`}>
                        {question.difficulty} ({question.points}pts)
                      </span>
                    </div>
                    {answer ? (
                      <>
                        <p className="text-sm text-foreground">Your Answer: <span className={answer.is_correct ? "text-green-500" : "text-red-500"}>{answer.user_answer}</span></p>
                        {!answer.is_correct && <p className="text-sm text-green-500">Correct Answer: {answer.correct_answer}</p>}
                        <p className="text-xs text-muted-foreground mt-1">Time: {answer.time_spent}s</p>
                      </>
                    ) : (
                      <p className="text-sm text-yellow-500">Not Attempted</p>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <Button 
            onClick={() => navigate("/")}
            className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
          >
            <Home className="w-5 h-5 mr-2" />
            Back to Home
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Results;

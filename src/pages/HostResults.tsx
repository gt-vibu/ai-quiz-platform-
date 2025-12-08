import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Loader2, Trophy, Users, BarChart3, Home, Eye, 
  TrendingUp, TrendingDown, Clock, Target, Award
} from "lucide-react";
import { TopicAnalysis } from "@/components/results/TopicAnalysis";
import { PerformanceCharts } from "@/components/results/PerformanceCharts";
import { Progress } from "@/components/ui/progress";

interface Question {
  id: string;
  question: string;
  correct_answer: string;
  difficulty: string;
  points: number;
  topic?: string;
  subtopic?: string;
}

interface Participant {
  id: string;
  name: string;
  score: number;
  completed: boolean;
  total_time_spent: number;
  answer_details: any[];
  is_host: boolean;
}

interface QuizStats {
  total_participants: number;
  highest_score: number;
  lowest_score: number;
  average_score: number;
}

interface Quiz {
  id: string;
  topic: string;
  difficulty_mode: string;
  timer_per_question: number;
  question_count: number;
  code: string;
}

const HostResults = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [quizStats, setQuizStats] = useState<QuizStats | null>(null);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);

  useEffect(() => {
    fetchHostResults();
  }, [code]);

  const fetchHostResults = async () => {
    try {
      const { data: quizData } = await supabase
        .from("quizzes")
        .select("*")
        .eq("code", code)
        .single();

      if (quizData) {
        setQuiz(quizData);

        const [questionsRes, participantsRes, statsRes] = await Promise.all([
          supabase.from("questions").select("*").eq("quiz_id", quizData.id).order("created_at"),
          supabase.from("participants").select("*").eq("quiz_id", quizData.id).eq("is_host", false).order("score", { ascending: false }),
          supabase.from("quiz_stats").select("*").eq("quiz_id", quizData.id).single(),
        ]);

        setQuestions(questionsRes.data || []);
        const mappedParticipants = (participantsRes.data || []).map((p) => ({
          ...p,
          answer_details: Array.isArray(p.answer_details) ? p.answer_details : [],
        })) as Participant[];
        setParticipants(mappedParticipants);
        if (statsRes.data) setQuizStats(statsRes.data);
      }
    } catch (error) {
      console.error("Error fetching host results:", error);
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

  const totalPossiblePoints = questions.reduce((sum, q) => sum + q.points, 0);
  const completedParticipants = participants.filter((p) => p.completed);
  const avgScore = participants.length > 0 
    ? participants.reduce((sum, p) => sum + p.score, 0) / participants.length 
    : 0;

  // Aggregate all answers for class-wide analysis
  const allAnswerDetails = participants.flatMap((p) => 
    Array.isArray(p.answer_details) ? p.answer_details : []
  );

  // Question difficulty analysis
  const questionAnalysis = questions.map((q) => {
    const answers = allAnswerDetails.filter((a: any) => a.question_id === q.id);
    const correct = answers.filter((a: any) => a.is_correct).length;
    const attempted = answers.length;
    const avgTime = answers.length > 0 
      ? Math.round(answers.reduce((sum: number, a: any) => sum + a.time_spent, 0) / answers.length)
      : 0;

    return {
      ...q,
      attempted,
      correct,
      incorrect: attempted - correct,
      accuracy: attempted > 0 ? (correct / attempted) * 100 : 0,
      avgTime,
    };
  });

  const hardestQuestions = [...questionAnalysis].sort((a, b) => a.accuracy - b.accuracy).slice(0, 5);
  const easiestQuestions = [...questionAnalysis].sort((a, b) => b.accuracy - a.accuracy).slice(0, 5);

  const selectedP = participants.find((p) => p.id === selectedParticipant);
  const selectedAnswers = selectedP && Array.isArray(selectedP.answer_details) ? selectedP.answer_details : [];

  return (
    <div className="min-h-screen p-4 md:p-8 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 pointer-events-none" />

      <div className="max-w-7xl mx-auto relative">
        {/* Header */}
        <Card className="p-6 mb-6 backdrop-blur-sm border-primary/30 shadow-lg">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Host Analytics Dashboard
                </h1>
              </div>
              <p className="text-xl text-foreground">{quiz?.topic}</p>
              <p className="text-sm text-muted-foreground">Quiz Code: {quiz?.code}</p>
            </div>
            <Button onClick={() => navigate("/")} variant="outline">
              <Home className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="p-4 text-center bg-card/80">
            <Users className="w-6 h-6 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-bold text-foreground">{participants.length}</p>
            <p className="text-sm text-muted-foreground">Participants</p>
          </Card>
          <Card className="p-4 text-center bg-card/80">
            <Trophy className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
            <p className="text-2xl font-bold text-foreground">{quizStats?.highest_score || 0}</p>
            <p className="text-sm text-muted-foreground">Top Score</p>
          </Card>
          <Card className="p-4 text-center bg-card/80">
            <Target className="w-6 h-6 mx-auto mb-2 text-green-500" />
            <p className="text-2xl font-bold text-foreground">{avgScore.toFixed(1)}</p>
            <p className="text-sm text-muted-foreground">Avg Score</p>
          </Card>
          <Card className="p-4 text-center bg-card/80">
            <BarChart3 className="w-6 h-6 mx-auto mb-2 text-accent" />
            <p className="text-2xl font-bold text-foreground">{questions.length}</p>
            <p className="text-sm text-muted-foreground">Questions</p>
          </Card>
          <Card className="p-4 text-center bg-card/80">
            <Clock className="w-6 h-6 mx-auto mb-2 text-blue-500" />
            <p className="text-2xl font-bold text-foreground">{completedParticipants.length}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </Card>
        </div>

        <Tabs defaultValue="leaderboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
            <TabsTrigger value="questions">Questions</TabsTrigger>
            <TabsTrigger value="individual">Individual</TabsTrigger>
            <TabsTrigger value="insights">Class Insights</TabsTrigger>
          </TabsList>

          {/* Leaderboard Tab */}
          <TabsContent value="leaderboard">
            <Card className="p-6 bg-card/50">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Participant Rankings
              </h2>
              <div className="space-y-3">
                {participants.map((p, idx) => (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between p-4 rounded-lg border transition-colors cursor-pointer hover:border-primary/50 ${
                      idx === 0 ? "bg-yellow-500/10 border-yellow-500/30" :
                      idx === 1 ? "bg-gray-400/10 border-gray-400/30" :
                      idx === 2 ? "bg-amber-600/10 border-amber-600/30" :
                      "bg-card border-border"
                    }`}
                    onClick={() => setSelectedParticipant(p.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        idx === 0 ? "bg-yellow-500 text-black" :
                        idx === 1 ? "bg-gray-400 text-black" :
                        idx === 2 ? "bg-amber-600 text-white" :
                        "bg-muted text-foreground"
                      }`}>
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{p.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {p.completed ? "Completed" : "In Progress"} • {Math.floor(p.total_time_spent / 60)}m {p.total_time_spent % 60}s
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{p.score}</p>
                      <p className="text-sm text-muted-foreground">/{totalPossiblePoints}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Questions Analysis Tab */}
          <TabsContent value="questions">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6 bg-red-500/5 border-red-500/20">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                  Hardest Questions (Lowest Success)
                </h3>
                <div className="space-y-3">
                  {hardestQuestions.map((q, idx) => (
                    <div key={q.id} className="p-3 bg-card rounded-lg border border-border">
                      <p className="text-sm font-medium text-foreground mb-2 line-clamp-2">{q.question}</p>
                      <div className="flex justify-between items-center">
                        <Progress value={q.accuracy} className="flex-1 mr-4 h-2" />
                        <span className="text-sm font-bold text-red-500">{q.accuracy.toFixed(0)}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {q.correct}/{q.attempted} correct • Avg time: {q.avgTime}s
                      </p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6 bg-green-500/5 border-green-500/20">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  Easiest Questions (Highest Success)
                </h3>
                <div className="space-y-3">
                  {easiestQuestions.map((q, idx) => (
                    <div key={q.id} className="p-3 bg-card rounded-lg border border-border">
                      <p className="text-sm font-medium text-foreground mb-2 line-clamp-2">{q.question}</p>
                      <div className="flex justify-between items-center">
                        <Progress value={q.accuracy} className="flex-1 mr-4 h-2" />
                        <span className="text-sm font-bold text-green-500">{q.accuracy.toFixed(0)}%</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {q.correct}/{q.attempted} correct • Avg time: {q.avgTime}s
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>

            {/* All Questions */}
            <Card className="p-6 mt-6 bg-card/50">
              <h3 className="text-lg font-bold mb-4">All Questions Analysis</h3>
              <div className="space-y-4">
                {questionAnalysis.map((q, idx) => (
                  <div key={q.id} className="p-4 border border-border rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium text-foreground">Q{idx + 1}. {q.question}</p>
                      <span className={`text-xs px-2 py-1 rounded ${
                        q.difficulty === "hard" ? "bg-red-500/20 text-red-500" :
                        q.difficulty === "medium" ? "bg-yellow-500/20 text-yellow-500" :
                        "bg-green-500/20 text-green-500"
                      }`}>
                        {q.difficulty}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Correct</p>
                        <p className="font-bold text-green-500">{q.correct}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Incorrect</p>
                        <p className="font-bold text-red-500">{q.incorrect}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Accuracy</p>
                        <p className="font-bold text-foreground">{q.accuracy.toFixed(0)}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Time</p>
                        <p className="font-bold text-foreground">{q.avgTime}s</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          {/* Individual Results Tab */}
          <TabsContent value="individual">
            <Card className="p-6 bg-card/50">
              <h2 className="text-xl font-bold mb-4">Select a Participant</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {participants.map((p) => (
                  <Button
                    key={p.id}
                    variant={selectedParticipant === p.id ? "default" : "outline"}
                    onClick={() => setSelectedParticipant(p.id)}
                    className="justify-start"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {p.name}
                  </Button>
                ))}
              </div>

              {selectedP && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card className="p-4 text-center bg-primary/10 border-primary/20">
                      <p className="text-2xl font-bold text-primary">{selectedP.score}</p>
                      <p className="text-sm text-muted-foreground">Score</p>
                    </Card>
                    <Card className="p-4 text-center bg-green-500/10 border-green-500/20">
                      <p className="text-2xl font-bold text-green-500">
                        {selectedAnswers.filter((a: any) => a.is_correct).length}
                      </p>
                      <p className="text-sm text-muted-foreground">Correct</p>
                    </Card>
                    <Card className="p-4 text-center bg-red-500/10 border-red-500/20">
                      <p className="text-2xl font-bold text-red-500">
                        {selectedAnswers.filter((a: any) => !a.is_correct && a.user_answer).length}
                      </p>
                      <p className="text-sm text-muted-foreground">Incorrect</p>
                    </Card>
                    <Card className="p-4 text-center bg-yellow-500/10 border-yellow-500/20">
                      <p className="text-2xl font-bold text-yellow-500">
                        {questions.length - selectedAnswers.length}
                      </p>
                      <p className="text-sm text-muted-foreground">Skipped</p>
                    </Card>
                  </div>

                  <TopicAnalysis 
                    questions={questions} 
                    answerDetails={selectedAnswers}
                  />

                  <PerformanceCharts
                    questions={questions}
                    answerDetails={selectedAnswers}
                    correctAnswers={selectedAnswers.filter((a: any) => a.is_correct).length}
                    wrongAnswers={selectedAnswers.filter((a: any) => !a.is_correct && a.user_answer).length}
                    skippedQuestions={questions.length - selectedAnswers.length}
                  />

                  <Button
                    onClick={() => navigate(`/results/${quiz?.code}/${selectedP.id}`)}
                    className="w-full"
                  >
                    View Full Report for {selectedP.name}
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Class Insights Tab */}
          <TabsContent value="insights">
            <div className="space-y-6">
              <TopicAnalysis 
                questions={questions} 
                answerDetails={allAnswerDetails}
              />

              <PerformanceCharts
                questions={questions}
                answerDetails={allAnswerDetails}
                correctAnswers={allAnswerDetails.filter((a: any) => a.is_correct).length}
                wrongAnswers={allAnswerDetails.filter((a: any) => !a.is_correct && a.user_answer).length}
                skippedQuestions={participants.length * questions.length - allAnswerDetails.length}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default HostResults;

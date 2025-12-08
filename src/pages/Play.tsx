import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, Clock, Trophy } from "lucide-react";
import PowerBoosters, {
  Booster,
  BoosterType,
  generateRandomBoosters,
  BOOSTER_INFO,
} from "@/components/quiz/PowerBoosters";

interface Question {
  id: string;
  type: string;
  question: string;
  options: string[] | null;
  correct_answer: string;
  difficulty: string;
  points: number;
  time_limit: number;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  completed: boolean;
}

const Play = () => {
  const { code, participantId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [answerDetails, setAnswerDetails] = useState<any[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [quizId, setQuizId] = useState<string>("");
  const [streak, setStreak] = useState(0);

  // Power Boosters state
  const [boosters, setBoosters] = useState<Booster[]>([]);
  const [activeBooster, setActiveBooster] = useState<BoosterType | null>(null);
  const [timeFrozen, setTimeFrozen] = useState(false);
  const [streakProtected, setStreakProtected] = useState(false);
  const [hiddenOptions, setHiddenOptions] = useState<string[]>([]);
  const [boostersInitialized, setBoostersInitialized] = useState(false);
  const [boostersEnabled, setBoostersEnabled] = useState(true);

  useEffect(() => {
    fetchQuestions();
    initializeBoosters();
  }, [code]);

  const initializeBoosters = async () => {
    // First check if boosters are enabled for this quiz
    const { data: quiz } = await supabase
      .from("quizzes")
      .select("boosters_enabled")
      .eq("code", code)
      .single();

    if (!quiz || quiz.boosters_enabled === false) {
      setBoostersEnabled(false);
      setBoostersInitialized(true);
      return;
    }

    // Check if participant already has boosters
    const { data: participant } = await supabase
      .from("participants")
      .select("*")
      .eq("id", participantId)
      .single();

    const existingBoosters = (participant as any)?.boosters;
    if (existingBoosters && Array.isArray(existingBoosters) && existingBoosters.length > 0) {
      setBoosters(existingBoosters as Booster[]);
    } else {
      // Generate new boosters
      const newBoosters = generateRandomBoosters();
      setBoosters(newBoosters);

      // Save to database using raw SQL approach via RPC or direct update
      await supabase
        .from("participants")
        .update({ boosters: newBoosters } as any)
        .eq("id", participantId);

      toast({
        title: "Power Boosters Received!",
        description: `You got: ${newBoosters.map((b) => BOOSTER_INFO[b.type].name).join(", ")}`,
      });
    }
    setBoostersInitialized(true);
  };

  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      setTimeRemaining(questions[currentQuestionIndex].time_limit);
      setQuestionStartTime(Date.now());
      setHiddenOptions([]);
      setActiveBooster(null);
      setTimeFrozen(false);
      setStreakProtected(false);
    }
  }, [currentQuestionIndex, questions]);

  useEffect(() => {
    if (timeRemaining > 0 && !showResult && !timeFrozen) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleSubmit(null, true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeRemaining, showResult, currentQuestionIndex, timeFrozen]);

  useEffect(() => {
    if (!quizId) return;

    fetchLeaderboard();

    const channel = supabase
      .channel(`quiz_${quizId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `quiz_id=eq.${quizId}`,
        },
        () => {
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [quizId]);

  const fetchQuestions = async () => {
    try {
      const { data: quiz } = await supabase
        .from("quizzes")
        .select("id, boosters_enabled")
        .eq("code", code)
        .single();

      if (!quiz) {
        toast({
          title: "Quiz not found",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setQuizId(quiz.id);
      setBoostersEnabled(quiz.boosters_enabled !== false);

      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", quiz.id)
        .order("created_at");

      if (error) throw error;

      const transformedQuestions = (data || []).map((q) => ({
        id: q.id,
        type: q.type,
        question: q.question,
        options: q.options as string[] | null,
        correct_answer: q.correct_answer,
        difficulty: q.difficulty || "medium",
        points: q.points || 1,
        time_limit: q.time_limit || 30,
      }));

      setQuestions(transformedQuestions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast({
        title: "Error",
        description: "Failed to load questions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    if (!quizId) return;

    const { data } = await supabase
      .from("participants")
      .select("id, name, score, completed")
      .eq("quiz_id", quizId)
      .order("score", { ascending: false })
      .limit(10);

    setLeaderboard(data || []);
  };

  const handleUseBooster = (boosterId: string, type: BoosterType) => {
    const currentQuestion = questions[currentQuestionIndex];

    // Mark booster as used
    const updatedBoosters = boosters.map((b) =>
      b.id === boosterId ? { ...b, used: true } : b
    );
    setBoosters(updatedBoosters);

    // Save to database
    supabase
      .from("participants")
      .update({ boosters: updatedBoosters } as any)
      .eq("id", participantId);

    switch (type) {
      case "double_points":
      case "double_jeopardy":
        setActiveBooster(type);
        toast({
          title: `${BOOSTER_INFO[type].name} Activated!`,
          description: BOOSTER_INFO[type].description,
        });
        break;

      case "time_freeze":
        setTimeFrozen(true);
        toast({
          title: "Time Frozen!",
          description: "The timer has been stopped for this question",
        });
        break;

      case "streak_freeze":
        setStreakProtected(true);
        toast({
          title: "Streak Protected!",
          description: "Your streak is safe even if you answer wrong",
        });
        break;

      case "eraser":
        if (currentQuestion.type === "multiple_choice" && currentQuestion.options) {
          const wrongOptions = currentQuestion.options.filter(
            (opt) => opt !== currentQuestion.correct_answer && !hiddenOptions.includes(opt)
          );
          if (wrongOptions.length > 0) {
            const randomWrong = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
            setHiddenOptions([...hiddenOptions, randomWrong]);
            toast({
              title: "Option Eliminated!",
              description: "One wrong answer has been removed",
            });
          }
        }
        break;

      case "vaccine":
        if (currentQuestion.type === "multiple_choice" && currentQuestion.options) {
          const wrongOptions = currentQuestion.options.filter(
            (opt) => opt !== currentQuestion.correct_answer && !hiddenOptions.includes(opt)
          );
          const toRemove = wrongOptions.slice(0, 2);
          setHiddenOptions([...hiddenOptions, ...toRemove]);
          toast({
            title: "50/50 Activated!",
            description: "Two wrong answers have been removed",
          });
        }
        break;
    }
  };

  const handleSubmit = async (e?: React.FormEvent | null, timeExpired = false) => {
    if (e) e.preventDefault();

    const currentQuestion = questions[currentQuestionIndex];
    const userAnswer = timeExpired ? "" : (answers[currentQuestion.id] || "");
    const timeSpent = Math.floor((Date.now() - questionStartTime) / 1000);
    const isCorrect =
      userAnswer.toLowerCase().trim() === currentQuestion.correct_answer.toLowerCase().trim();

    // Calculate points with booster effects
    let pointsEarned = 0;
    let boosterEffect = "";

    if (isCorrect) {
      pointsEarned = currentQuestion.points;

      if (activeBooster === "double_points") {
        pointsEarned *= 2;
        boosterEffect = "2x Points!";
      } else if (activeBooster === "double_jeopardy") {
        pointsEarned *= 2;
        boosterEffect = "Double Jeopardy Win!";
      }

      // Update streak
      setStreak((prev) => prev + 1);
    } else {
      if (activeBooster === "double_jeopardy") {
        pointsEarned = -currentQuestion.points;
        boosterEffect = "Double Jeopardy Loss!";
      }

      // Handle streak
      if (!streakProtected) {
        setStreak(0);
      } else {
        boosterEffect = "Streak Protected!";
      }
    }

    if (boosterEffect) {
      toast({
        title: boosterEffect,
        description: `${isCorrect ? "+" : ""}${pointsEarned} points`,
      });
    }

    const newAnswerDetail = {
      question_id: currentQuestion.id,
      user_answer: userAnswer,
      correct_answer: currentQuestion.correct_answer,
      is_correct: isCorrect,
      time_spent: timeSpent,
      difficulty: currentQuestion.difficulty,
      points: pointsEarned,
      booster_used: activeBooster,
    };

    const updatedAnswerDetails = [...answerDetails, newAnswerDetail];
    setAnswerDetails(updatedAnswerDetails);

    const newScore = Math.max(0, score + pointsEarned);
    setScore(newScore);

    await supabase
      .from("participants")
      .update({
        score: newScore,
        answer_details: updatedAnswerDetails,
      })
      .eq("id", participantId);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setSubmitting(true);

      const totalTimeSpent = updatedAnswerDetails.reduce(
        (sum, detail) => sum + detail.time_spent,
        0
      );

      const { error } = await supabase
        .from("participants")
        .update({
          score: newScore,
          answers: answers,
          answer_details: updatedAnswerDetails,
          total_time_spent: totalTimeSpent,
          completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq("id", participantId);

      if (error) {
        console.error("Error submitting quiz:", error);
        toast({
          title: "Error",
          description: "Failed to submit quiz",
          variant: "destructive",
        });
      }

      setShowResult(true);

      setTimeout(() => {
        navigate(`/results/${code}/${participantId}`);
      }, 1500);

      setSubmitting(false);
    }
  };

  if (loading || !boostersInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-2xl p-8 relative backdrop-blur-sm border-primary/30 shadow-lg shadow-primary/20">
          <div className="text-center">
            <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4 animate-scale-in" />
            <h2 className="text-3xl font-bold mb-4 text-foreground">Quiz Completed!</h2>
            <p className="text-xl text-muted-foreground mb-6">
              Your score: <span className="text-primary font-bold">{score} points</span>
            </p>
            <p className="text-muted-foreground">Redirecting to results...</p>
          </div>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const visibleOptions = currentQuestion.options?.filter(
    (opt) => !hiddenOptions.includes(opt)
  );

  return (
    <div className="min-h-screen p-4 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 pointer-events-none" />

      <div className="flex gap-4 max-w-7xl mx-auto">
        <div className="flex-1">
          <Card className="p-8 relative backdrop-blur-sm border-primary/30 shadow-lg shadow-primary/20">
            {/* Progress and Timer Header */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </span>
                <div className="flex items-center gap-4">
                  {streak > 1 && (
                    <span className="text-sm font-semibold px-3 py-1 rounded bg-orange-500/20 text-orange-500 animate-pulse">
                      🔥 {streak} Streak
                    </span>
                  )}
                  <span
                    className={`text-sm font-semibold px-3 py-1 rounded ${
                      currentQuestion.difficulty === "hard"
                        ? "bg-red-500/20 text-red-500"
                        : currentQuestion.difficulty === "medium"
                        ? "bg-yellow-500/20 text-yellow-500"
                        : "bg-green-500/20 text-green-500"
                    }`}
                  >
                    {currentQuestion.difficulty} ({currentQuestion.points}pts)
                  </span>
                  <div
                    className={`flex items-center gap-2 px-3 py-1 rounded ${
                      timeFrozen
                        ? "bg-cyan-500/20 text-cyan-500"
                        : timeRemaining <= 10
                        ? "bg-red-500/20 text-red-500 animate-pulse"
                        : "bg-primary/20 text-primary"
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span className="font-bold">
                      {timeFrozen ? "⏸️" : ""} {timeRemaining}s
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-full bg-secondary/20 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Power Boosters */}
            {boostersEnabled && (
              <div className="mb-6">
                <PowerBoosters
                  boosters={boosters}
                  onUseBooster={handleUseBooster}
                  disabled={submitting}
                  activeBooster={activeBooster}
                  isMultipleChoice={currentQuestion.type === "multiple_choice"}
                />
              </div>
            )}

            {/* Active Booster Indicator */}
            {activeBooster && (
              <div
                className={`mb-4 p-2 rounded-lg text-center text-sm font-semibold ${BOOSTER_INFO[activeBooster].color}`}
              >
                {BOOSTER_INFO[activeBooster].name} Active!
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-2xl font-bold text-foreground">
                  {currentQuestion.question}
                </h3>

                {currentQuestion.type === "multiple_choice" && visibleOptions ? (
                  <div className="space-y-3">
                    {visibleOptions.map((option, index) => (
                      <label
                        key={index}
                        className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                          answers[currentQuestion.id] === option
                            ? "border-primary bg-primary/10"
                            : "border-primary/20 hover:border-primary/40 bg-card/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name="answer"
                          value={option}
                          checked={answers[currentQuestion.id] === option}
                          onChange={(e) =>
                            setAnswers({
                              ...answers,
                              [currentQuestion.id]: e.target.value,
                            })
                          }
                          className="sr-only"
                        />
                        <span className="text-foreground font-medium">{option}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="answer" className="text-foreground">
                      Your Answer
                    </Label>
                    <Textarea
                      id="answer"
                      placeholder="Type your answer here..."
                      value={answers[currentQuestion.id] || ""}
                      onChange={(e) =>
                        setAnswers({
                          ...answers,
                          [currentQuestion.id]: e.target.value,
                        })
                      }
                      className="min-h-[100px] bg-card/50 border-primary/30 focus:border-primary"
                    />
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 font-semibold py-6"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : currentQuestionIndex < questions.length - 1 ? (
                  "Next Question"
                ) : (
                  "Submit Quiz"
                )}
              </Button>
            </form>
          </Card>
        </div>

        {/* Live Leaderboard */}
        <div className="w-80 hidden lg:block">
          <Card className="p-6 backdrop-blur-sm border-primary/30 shadow-lg shadow-primary/20 sticky top-4">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <h3 className="text-xl font-bold text-foreground">Live Leaderboard</h3>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {leaderboard.map((participant, index) => (
                <div
                  key={participant.id}
                  className={`p-3 rounded-lg border ${
                    participant.id === participantId
                      ? "border-primary bg-primary/10"
                      : "border-primary/20 bg-card/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-bold ${
                          index === 0
                            ? "text-yellow-500"
                            : index === 1
                            ? "text-gray-400"
                            : index === 2
                            ? "text-orange-500"
                            : "text-muted-foreground"
                        }`}
                      >
                        #{index + 1}
                      </span>
                      <span className="text-foreground font-medium truncate">
                        {participant.name}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-primary font-bold">{participant.score}</span>
                      {participant.completed && (
                        <CheckCircle2 className="w-4 h-4 text-green-500 ml-2 inline" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Play;

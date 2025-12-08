import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  Loader2, 
  LogOut, 
  History, 
  TrendingUp, 
  Plus,
  GraduationCap,
  Calendar,
  Trophy
} from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  age_category: string | null;
}

interface QuizHistory {
  id: string;
  quiz_id: string;
  name: string;
  score: number;
  completed_at: string;
  total_time_spent: number;
  quiz: {
    topic: string;
    code: string;
  };
}

interface CreatedQuiz {
  id: string;
  topic: string;
  code: string;
  question_count: number;
  created_at: string;
  participants: { count: number }[];
}

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [quizHistory, setQuizHistory] = useState<QuizHistory[]>([]);
  const [createdQuizzes, setCreatedQuizzes] = useState<CreatedQuiz[]>([]);
  const [filterPeriod, setFilterPeriod] = useState<"all" | "day" | "week" | "month">("all");

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      navigate("/auth");
      return;
    }

    setUser(session.user);
    await fetchProfile(session.user.id);
    await fetchQuizHistory(session.user.id);
    await fetchCreatedQuizzes(session.user.id);
    setLoading(false);
  };

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return;
    }

    setProfile(data);
  };

  const fetchQuizHistory = async (userId: string) => {
    const { data, error } = await supabase
      .from("participants")
      .select(`
        id,
        quiz_id,
        name,
        score,
        completed_at,
        total_time_spent,
        quiz:quizzes(topic, code)
      `)
      .eq("user_id", userId)
      .eq("completed", true)
      .order("completed_at", { ascending: false });

    if (error) {
      console.error("Error fetching quiz history:", error);
      return;
    }

    setQuizHistory(data as any);
  };

  const fetchCreatedQuizzes = async (userId: string) => {
    const { data, error } = await supabase
      .from("quizzes")
      .select(`
        id,
        topic,
        code,
        question_count,
        created_at,
        participants(count)
      `)
      .eq("created_by", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching created quizzes:", error);
      return;
    }

    setCreatedQuizzes(data as any);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Error logging out");
      return;
    }
    toast.success("Logged out successfully");
    navigate("/");
  };

  const getFilteredHistory = () => {
    if (filterPeriod === "all") return quizHistory;
    
    const now = new Date();
    const filtered = quizHistory.filter((quiz) => {
      const completedDate = new Date(quiz.completed_at);
      const diffTime = Math.abs(now.getTime() - completedDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      switch (filterPeriod) {
        case "day":
          return diffDays <= 1;
        case "week":
          return diffDays <= 7;
        case "month":
          return diffDays <= 30;
        default:
          return true;
      }
    });

    return filtered;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative">
        {/* Header */}
        <Card className="p-6 mb-6 backdrop-blur-sm border-primary/30 shadow-lg shadow-primary/20">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center animate-glow">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                  Welcome back, {profile?.full_name || "User"}!
                </h1>
                <p className="text-muted-foreground">{profile?.email}</p>
              </div>
            </div>
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="p-6 bg-gradient-to-br from-blue-500/20 to-blue-600/10 border-blue-500/30">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Quizzes Completed</p>
                <p className="text-2xl font-bold text-blue-500">{quizHistory.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-green-500/20 to-green-600/10 border-green-500/30">
            <div className="flex items-center gap-3">
              <Plus className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Quizzes Created</p>
                <p className="text-2xl font-bold text-green-500">{createdQuizzes.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6 bg-gradient-to-br from-purple-500/20 to-purple-600/10 border-purple-500/30">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-sm text-muted-foreground">Average Score</p>
                <p className="text-2xl font-bold text-purple-500">
                  {quizHistory.length > 0
                    ? Math.round(quizHistory.reduce((sum, q) => sum + q.score, 0) / quizHistory.length)
                    : 0}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="history" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              Quiz History
            </TabsTrigger>
            <TabsTrigger value="created" className="gap-2">
              <Plus className="w-4 h-4" />
              My Quizzes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history">
            <Card className="p-6 backdrop-blur-sm border-primary/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Your Quiz History</h2>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={filterPeriod === "all" ? "default" : "outline"}
                    onClick={() => setFilterPeriod("all")}
                  >
                    All
                  </Button>
                  <Button
                    size="sm"
                    variant={filterPeriod === "day" ? "default" : "outline"}
                    onClick={() => setFilterPeriod("day")}
                  >
                    Today
                  </Button>
                  <Button
                    size="sm"
                    variant={filterPeriod === "week" ? "default" : "outline"}
                    onClick={() => setFilterPeriod("week")}
                  >
                    Week
                  </Button>
                  <Button
                    size="sm"
                    variant={filterPeriod === "month" ? "default" : "outline"}
                    onClick={() => setFilterPeriod("month")}
                  >
                    Month
                  </Button>
                </div>
              </div>

              {getFilteredHistory().length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No quiz history found for this period</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getFilteredHistory().map((quiz) => (
                    <Card
                      key={quiz.id}
                      className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => navigate(`/results/${quiz.quiz.code}/${quiz.id}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{quiz.quiz.topic}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(quiz.completed_at).toLocaleDateString()}
                            </span>
                            <span>Score: {quiz.score} points</span>
                            <span>Time: {Math.floor(quiz.total_time_spent / 60)}m {quiz.total_time_spent % 60}s</span>
                          </div>
                        </div>
                        <Trophy className="w-8 h-8 text-primary" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="created">
            <Card className="p-6 backdrop-blur-sm border-primary/20">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Quizzes You Created</h2>
                <Button onClick={() => navigate("/create")} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create New Quiz
                </Button>
              </div>

              {createdQuizzes.length === 0 ? (
                <div className="text-center py-12">
                  <Plus className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">You haven't created any quizzes yet</p>
                  <Button onClick={() => navigate("/create")}>Create Your First Quiz</Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {createdQuizzes.map((quiz) => (
                    <Card
                      key={quiz.id}
                      className="p-4 cursor-pointer hover:border-primary/50 transition-colors"
                      onClick={() => navigate(`/quiz/${quiz.code}`)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{quiz.topic}</h3>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>Code: {quiz.code}</span>
                            <span>{quiz.question_count} questions</span>
                            <span>{quiz.participants[0]?.count || 0} participants</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {new Date(quiz.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <Button
            size="lg"
            onClick={() => navigate("/create")}
            className="h-24 text-lg bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
          >
            <Plus className="w-6 h-6 mr-2" />
            Create New Quiz
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/join")}
            className="h-24 text-lg"
          >
            <GraduationCap className="w-6 h-6 mr-2" />
            Join a Quiz
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

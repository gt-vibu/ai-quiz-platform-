import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Clock, Copy, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Quiz {
  id: string;
  code: string;
  topic: string;
  question_count: number;
  created_at: string;
}

interface Participant {
  id: string;
  name: string;
  score: number;
  completed: boolean;
  joined_at: string;
}

const Quiz = () => {
  const { code } = useParams<{ code: string }>();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchQuiz = async () => {
      if (!code) return;

      try {
        const { data: quizData, error: quizError } = await supabase
          .from("quizzes")
          .select("*")
          .eq("code", code.toUpperCase())
          .single();

        if (quizError) throw quizError;
        setQuiz(quizData);

        const { data: participantsData, error: participantsError } = await supabase
          .from("participants")
          .select("*")
          .eq("quiz_id", quizData.id)
          .order("score", { ascending: false });

        if (participantsError) throw participantsError;
        setParticipants(participantsData || []);
      } catch (error) {
        console.error("Error fetching quiz:", error);
        toast({
          title: "Error",
          description: "Failed to load quiz",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('quiz-participants')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
        },
        () => {
          fetchQuiz();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [code, toast]);

  const copyCode = () => {
    if (quiz?.code) {
      navigator.clipboard.writeText(quiz.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Quiz code copied to clipboard",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">Quiz Not Found</h2>
          <p className="text-muted-foreground">The quiz code you entered doesn't exist.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Quiz Info */}
        <Card className="p-6 md:p-8 backdrop-blur-sm border-primary/30 shadow-lg shadow-primary/20">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {quiz.topic}
              </h1>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                  {quiz.question_count} Questions
                </Badge>
                <Badge variant="secondary" className="bg-secondary/20 text-secondary border-secondary/30">
                  <Clock className="w-3 h-3 mr-1" />
                  Created {new Date(quiz.created_at).toLocaleDateString()}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Quiz Code</p>
                <div className="text-4xl font-bold tracking-wider bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {quiz.code}
                </div>
              </div>
              <Button
                onClick={copyCode}
                variant="outline"
                size="icon"
                className="border-primary/30 hover:bg-primary/10"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-primary" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Participants */}
        <Card className="p-6 md:p-8 backdrop-blur-sm border-secondary/30 shadow-lg shadow-secondary/20">
          <div className="flex items-center gap-2 mb-6">
            <Users className="w-6 h-6 text-secondary" />
            <h2 className="text-2xl font-bold">Participants ({participants.length})</h2>
          </div>

          {participants.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No participants yet. Share the code to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {participants.map((participant, index) => (
                <div
                  key={participant.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-card/50 border border-secondary/20 hover:border-secondary/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-secondary to-accent text-background font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold">{participant.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Joined {new Date(participant.joined_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{participant.score}</p>
                    {participant.completed && (
                      <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                        Completed
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Quiz;
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, LogIn } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Join = () => {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim() || !name.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter both quiz code and your name",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Check if quiz exists
      const { data: quiz, error: quizError } = await supabase
        .from("quizzes")
        .select("*")
        .eq("code", code.toUpperCase())
        .single();

      if (quizError || !quiz) {
        throw new Error("Quiz not found. Please check the code.");
      }

      // Create participant
      const { data: participant, error: participantError } = await supabase
        .from("participants")
        .insert({
          quiz_id: quiz.id,
          name: name.trim(),
        })
        .select()
        .single();

      if (participantError) throw participantError;

      toast({
        title: "Joined successfully!",
        description: `Welcome to the quiz, ${name}!`,
      });

      navigate(`/play/${quiz.code}/${participant.id}`);
    } catch (error) {
      console.error("Error joining quiz:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to join quiz. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 via-background to-accent/10 pointer-events-none" />
      
      <Card className="w-full max-w-md p-8 relative backdrop-blur-sm border-secondary/30 shadow-lg shadow-secondary/20">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-secondary to-accent mb-4 animate-glow">
            <LogIn className="w-8 h-8 text-background" />
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-secondary via-accent to-primary bg-clip-text text-transparent">
            Join Quiz
          </h1>
          <p className="text-muted-foreground">Enter the quiz code to participate</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="code" className="text-foreground">Quiz Code</Label>
            <Input
              id="code"
              placeholder="Enter 6-character code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              className="bg-card/50 border-secondary/30 focus:border-secondary transition-colors text-center text-2xl font-bold tracking-widest"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">Your Name</Label>
            <Input
              id="name"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-card/50 border-secondary/30 focus:border-secondary transition-colors"
              disabled={loading}
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-secondary to-accent hover:from-secondary/90 hover:to-accent/90 text-background font-semibold py-6 text-lg shadow-lg shadow-secondary/30 transition-all hover:shadow-secondary/50"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-5 w-5" />
                Join Quiz
              </>
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default Join;
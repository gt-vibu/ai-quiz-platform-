import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Brain, Zap, Users, Trophy, LogIn } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-secondary/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
      </div>

      {/* Hero Section */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        {/* Login button in top right */}
        <div className="absolute top-4 right-4">
          <Link to="/auth">
            <Button variant="outline" className="gap-2">
              <LogIn className="w-4 h-4" />
              Login / Sign Up
            </Button>
          </Link>
        </div>

        <div className="max-w-6xl mx-auto text-center space-y-12">
          <div className="space-y-6">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-primary via-accent to-secondary mb-6 animate-glow">
              <Brain className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-float">
              Quizmify
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-2">
              Create intelligent quizzes in seconds. Share with anyone. Compete in real-time.
            </p>
            <p className="text-lg md:text-xl text-accent font-semibold italic">
              Built for the brilliant
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/create">
              <Button className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold px-8 py-6 text-lg shadow-lg shadow-primary/30 transition-all hover:shadow-primary/50 hover:scale-105">
                <Zap className="mr-2 h-5 w-5" />
                Create Quiz
              </Button>
            </Link>
            <Link to="/join">
              <Button variant="outline" className="border-secondary/30 hover:bg-secondary/10 hover:border-secondary font-semibold px-8 py-6 text-lg transition-all hover:scale-105">
                <Users className="mr-2 h-5 w-5" />
                Join Quiz
              </Button>
            </Link>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <Card className="p-6 backdrop-blur-sm border-primary/30 hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/20 group">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent mb-4 group-hover:animate-glow">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">AI-Powered</h3>
              <p className="text-muted-foreground">
                Generate high-quality questions instantly using advanced AI
              </p>
            </Card>

            <Card className="p-6 backdrop-blur-sm border-secondary/30 hover:border-secondary/50 transition-all hover:shadow-lg hover:shadow-secondary/20 group">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-accent mb-4 group-hover:animate-glow">
                <Zap className="w-6 h-6 text-background" />
              </div>
              <h3 className="text-xl font-bold mb-2">Lightning Fast</h3>
              <p className="text-muted-foreground">
                Create and share quizzes in seconds with unique codes
              </p>
            </Card>

            <Card className="p-6 backdrop-blur-sm border-accent/30 hover:border-accent/50 transition-all hover:shadow-lg hover:shadow-accent/20 group">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-accent to-primary mb-4 group-hover:animate-glow">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-2">Real-Time</h3>
              <p className="text-muted-foreground">
                Track participants and scores live as they compete
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

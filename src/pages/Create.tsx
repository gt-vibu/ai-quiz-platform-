import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Sparkles, PenLine, Wand2, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import AIQuestionGenerator from "@/components/quiz-creation/AIQuestionGenerator";
import ManualQuestionCreator from "@/components/quiz-creation/ManualQuestionCreator";
import QuestionCard from "@/components/quiz-creation/QuestionCard";

interface Question {
  id: string;
  type: "multiple_choice" | "open_ended";
  question: string;
  options: string[];
  correct_answer: string;
  difficulty: string;
  selected?: boolean;
}

const Create = () => {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [timerPerQuestion, setTimerPerQuestion] = useState(30);
  const [optionCount, setOptionCount] = useState(4);
  const [boostersEnabled, setBoostersEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("ai");
  
  // Combined questions from both AI and manual
  const [finalQuestions, setFinalQuestions] = useState<Question[]>([]);
  const [manualQuestions, setManualQuestions] = useState<Question[]>([]);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleAddFromAI = (questions: Question[]) => {
    // Reset selection status and add to final questions
    const questionsToAdd = questions.map((q) => ({ ...q, selected: undefined }));
    setFinalQuestions((prev) => [...prev, ...questionsToAdd]);
  };

  const handleManualQuestionsChange = (questions: Question[]) => {
    setManualQuestions(questions);
  };

  const addManualToFinal = () => {
    // Validate manual questions
    const validQuestions = manualQuestions.filter(
      (q) => q.question.trim() && q.correct_answer.trim()
    );
    
    if (validQuestions.length === 0) {
      toast({
        title: "No valid questions",
        description: "Please fill in at least the question and correct answer",
        variant: "destructive",
      });
      return;
    }

    setFinalQuestions((prev) => [...prev, ...validQuestions]);
    setManualQuestions([]);
    toast({
      title: "Questions added!",
      description: `${validQuestions.length} manual questions added to your quiz`,
    });
  };

  const updateFinalQuestion = (id: string, updates: Partial<Question>) => {
    setFinalQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  const deleteFinalQuestion = (id: string) => {
    setFinalQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const handleCreateQuiz = async () => {
    if (!topic.trim()) {
      toast({
        title: "Missing topic",
        description: "Please enter a quiz topic",
        variant: "destructive",
      });
      return;
    }

    if (finalQuestions.length === 0) {
      toast({
        title: "No questions",
        description: "Please add at least one question to create a quiz",
        variant: "destructive",
      });
      return;
    }

    // Validate all questions
    const invalidQuestions = finalQuestions.filter(
      (q) => !q.question.trim() || !q.correct_answer.trim()
    );
    
    if (invalidQuestions.length > 0) {
      toast({
        title: "Invalid questions",
        description: "Please ensure all questions have text and correct answers",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("create-quiz", {
        body: {
          topic,
          difficulty,
          timerPerQuestion,
          boostersEnabled,
          questions: finalQuestions.map((q) => ({
            type: q.type,
            question: q.question,
            options: q.options.slice(0, optionCount),
            correct_answer: q.correct_answer,
            difficulty: q.difficulty,
          })),
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Quiz created!",
          description: `Your quiz code is: ${data.code}`,
        });
        navigate(`/quiz/${data.code}`);
      } else {
        throw new Error(data?.error || "Failed to create quiz");
      }
    } catch (error) {
      console.error("Error creating quiz:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create quiz",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 relative">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 pointer-events-none" />
      
      <div className="max-w-6xl mx-auto relative space-y-6">
        {/* Header */}
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent mb-4 animate-glow">
            <Wand2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
            Create Your Quiz
          </h1>
          <p className="text-muted-foreground">
            Use AI, create manually, or combine both!
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Panel */}
          <Card className="p-6 backdrop-blur-sm border-primary/30 shadow-lg shadow-primary/10 h-fit">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Quiz Settings</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="topic" className="text-foreground">Quiz Topic</Label>
                <Input
                  id="topic"
                  placeholder="e.g., World History, JavaScript"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="bg-card/50 border-primary/30"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="optionCount" className="text-foreground">Options per Question</Label>
                <select
                  id="optionCount"
                  value={optionCount}
                  onChange={(e) => setOptionCount(parseInt(e.target.value))}
                  className="w-full h-10 rounded-md border border-primary/30 bg-card/50 px-3 py-2 text-foreground"
                >
                  <option value={2}>2 Options</option>
                  <option value={3}>3 Options</option>
                  <option value={4}>4 Options</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty" className="text-foreground">Difficulty</Label>
                <select
                  id="difficulty"
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full h-10 rounded-md border border-primary/30 bg-card/50 px-3 py-2 text-foreground"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timer" className="text-foreground">Time per Question (sec)</Label>
                <Input
                  id="timer"
                  type="number"
                  min="10"
                  max="300"
                  value={timerPerQuestion}
                  onChange={(e) => setTimerPerQuestion(parseInt(e.target.value) || 30)}
                  className="bg-card/50 border-primary/30"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-primary/30 bg-card/50">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <Label htmlFor="boosters" className="text-foreground cursor-pointer">
                    Power Boosters
                  </Label>
                </div>
                <Switch
                  id="boosters"
                  checked={boostersEnabled}
                  onCheckedChange={setBoostersEnabled}
                />
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                {boostersEnabled ? "Players get 3 random boosters" : "No boosters in this quiz"}
              </p>
            </div>
          </Card>

          {/* Question Creation Panel */}
          <Card className="p-6 backdrop-blur-sm border-primary/30 shadow-lg shadow-primary/10 lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="ai" className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Generate
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <PenLine className="w-4 h-4" />
                  Manual Entry
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ai">
                <AIQuestionGenerator
                  topic={topic}
                  difficulty={difficulty}
                  optionCount={optionCount}
                  onAddQuestions={handleAddFromAI}
                />
              </TabsContent>

              <TabsContent value="manual">
                <ManualQuestionCreator
                  questions={manualQuestions}
                  onQuestionsChange={handleManualQuestionsChange}
                  optionCount={optionCount}
                  defaultDifficulty={difficulty}
                />
                {manualQuestions.length > 0 && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      onClick={addManualToFinal}
                      className="bg-secondary hover:bg-secondary/90"
                    >
                      Add to Quiz ({manualQuestions.length})
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Final Questions Preview */}
        {finalQuestions.length > 0 && (
          <Card className="p-6 backdrop-blur-sm border-accent/30 shadow-lg shadow-accent/10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">
                Quiz Questions ({finalQuestions.length})
              </h2>
              <Button
                onClick={handleCreateQuiz}
                disabled={loading}
                className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Quiz"
                )}
              </Button>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {finalQuestions.map((question, index) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  index={index}
                  onUpdate={updateFinalQuestion}
                  onDelete={deleteFinalQuestion}
                  isEditable={true}
                  optionCount={optionCount}
                />
              ))}
            </div>
          </Card>
        )}

        {/* Empty State */}
        {finalQuestions.length === 0 && (
          <Card className="p-8 text-center border-dashed border-2 border-muted-foreground/20">
            <div className="text-muted-foreground">
              <Wand2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Questions Yet</h3>
              <p className="text-sm">
                Generate questions with AI or create them manually to build your quiz.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Create;

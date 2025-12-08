import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import QuestionCard from "./QuestionCard";

interface GeneratedQuestion {
  id: string;
  type: "multiple_choice" | "open_ended";
  question: string;
  options: string[];
  correct_answer: string;
  difficulty: string;
  selected: boolean;
}

interface AIQuestionGeneratorProps {
  topic: string;
  difficulty: string;
  optionCount: number;
  onAddQuestions: (questions: GeneratedQuestion[]) => void;
}

const AIQuestionGenerator = ({
  topic,
  difficulty,
  optionCount,
  onAddQuestions,
}: AIQuestionGeneratorProps) => {
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [generateCount, setGenerateCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateQuestions = async () => {
    if (!topic.trim()) {
      toast({
        title: "Missing topic",
        description: "Please enter a quiz topic first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-questions", {
        body: {
          topic,
          questionCount: generateCount,
          difficulty,
          optionCount,
        },
      });

      if (error) throw error;

      if (data?.questions) {
        const questionsWithIds = data.questions.map((q: any) => ({
          ...q,
          id: crypto.randomUUID(),
          selected: false,
          options: q.options || Array(optionCount).fill(""),
        }));
        setGeneratedQuestions((prev) => [...prev, ...questionsWithIds]);
        toast({
          title: "Questions generated!",
          description: `${data.questions.length} new questions generated`,
        });
      }
    } catch (error) {
      console.error("Error generating questions:", error);
      toast({
        title: "Error",
        description: "Failed to generate questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleQuestionSelect = (id: string) => {
    setGeneratedQuestions((prev) =>
      prev.map((q) => (q.id === id ? { ...q, selected: !q.selected } : q))
    );
  };

  const selectAll = () => {
    setGeneratedQuestions((prev) => prev.map((q) => ({ ...q, selected: true })));
  };

  const deselectAll = () => {
    setGeneratedQuestions((prev) => prev.map((q) => ({ ...q, selected: false })));
  };

  const addSelectedQuestions = () => {
    const selected = generatedQuestions.filter((q) => q.selected);
    if (selected.length === 0) {
      toast({
        title: "No questions selected",
        description: "Please select at least one question to add",
        variant: "destructive",
      });
      return;
    }
    onAddQuestions(selected);
    setGeneratedQuestions((prev) => prev.filter((q) => !q.selected));
    toast({
      title: "Questions added!",
      description: `${selected.length} questions added to your quiz`,
    });
  };

  const removeQuestion = (id: string) => {
    setGeneratedQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  const selectedCount = generatedQuestions.filter((q) => q.selected).length;

  return (
    <div className="space-y-6">
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/30">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[150px]">
            <Label className="text-sm text-foreground">Generate Count</Label>
            <Input
              type="number"
              min={1}
              max={20}
              value={generateCount}
              onChange={(e) => setGenerateCount(parseInt(e.target.value) || 10)}
              className="bg-card/50 border-primary/30 mt-1"
            />
          </div>
          
          <Button
            onClick={generateQuestions}
            disabled={loading || !topic.trim()}
            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Questions
              </>
            )}
          </Button>

          {generatedQuestions.length > 0 && (
            <Button
              onClick={generateQuestions}
              variant="outline"
              disabled={loading}
              className="border-primary/30"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              More
            </Button>
          )}
        </div>
      </Card>

      {generatedQuestions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-foreground">
                Generated Questions ({generatedQuestions.length})
              </h3>
              <span className="text-sm text-primary">
                {selectedCount} selected
              </span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                Select All
              </Button>
              <Button variant="ghost" size="sm" onClick={deselectAll}>
                Deselect All
              </Button>
              <Button
                onClick={addSelectedQuestions}
                disabled={selectedCount === 0}
                size="sm"
                className="bg-primary hover:bg-primary/90"
              >
                Add Selected ({selectedCount})
              </Button>
            </div>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {generatedQuestions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={index}
                onUpdate={() => {}}
                onDelete={removeQuestion}
                onToggleSelect={toggleQuestionSelect}
                isSelectable={true}
                isEditable={false}
                optionCount={optionCount}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AIQuestionGenerator;

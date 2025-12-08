import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Plus } from "lucide-react";
import QuestionCard from "./QuestionCard";

interface ManualQuestion {
  id: string;
  type: "multiple_choice" | "open_ended";
  question: string;
  options: string[];
  correct_answer: string;
  difficulty: string;
}

interface ManualQuestionCreatorProps {
  questions: ManualQuestion[];
  onQuestionsChange: (questions: ManualQuestion[]) => void;
  optionCount: number;
  defaultDifficulty: string;
}

const ManualQuestionCreator = ({
  questions,
  onQuestionsChange,
  optionCount,
  defaultDifficulty,
}: ManualQuestionCreatorProps) => {
  const [newQuestionType, setNewQuestionType] = useState<"multiple_choice" | "open_ended">(
    "multiple_choice"
  );

  const addNewQuestion = () => {
    const newQuestion: ManualQuestion = {
      id: crypto.randomUUID(),
      type: newQuestionType,
      question: "",
      options: Array(optionCount).fill(""),
      correct_answer: "",
      difficulty: defaultDifficulty,
    };
    onQuestionsChange([...questions, newQuestion]);
  };

  const updateQuestion = (id: string, updates: Partial<ManualQuestion>) => {
    onQuestionsChange(
      questions.map((q) => (q.id === id ? { ...q, ...updates } : q))
    );
  };

  const deleteQuestion = (id: string) => {
    onQuestionsChange(questions.filter((q) => q.id !== id));
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 bg-gradient-to-br from-secondary/5 to-accent/5 border-secondary/30">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <Label className="text-sm text-foreground">Question Type</Label>
            <select
              value={newQuestionType}
              onChange={(e) =>
                setNewQuestionType(e.target.value as "multiple_choice" | "open_ended")
              }
              className="w-full h-10 rounded-md border border-secondary/30 bg-card/50 px-3 py-2 text-foreground mt-1"
            >
              <option value="multiple_choice">Multiple Choice</option>
              <option value="open_ended">Open Ended</option>
            </select>
          </div>

          <Button
            onClick={addNewQuestion}
            className="bg-gradient-to-r from-secondary to-accent hover:from-secondary/90 hover:to-accent/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>
      </Card>

      {questions.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">
            Manual Questions ({questions.length})
          </h3>

          <div className="space-y-3">
            {questions.map((question, index) => (
              <QuestionCard
                key={question.id}
                question={question}
                index={index}
                onUpdate={updateQuestion}
                onDelete={deleteQuestion}
                isEditable={true}
                optionCount={optionCount}
              />
            ))}
          </div>
        </div>
      )}

      {questions.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <p>No manual questions added yet.</p>
          <p className="text-sm">Click "Add Question" to create your own questions.</p>
        </div>
      )}
    </div>
  );
};

export default ManualQuestionCreator;

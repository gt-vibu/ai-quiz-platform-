import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, GripVertical, Check } from "lucide-react";

interface QuestionCardProps {
  question: {
    id: string;
    type: "multiple_choice" | "open_ended";
    question: string;
    options: string[];
    correct_answer: string;
    difficulty: string;
    selected?: boolean;
  };
  index: number;
  onUpdate: (id: string, updates: Partial<QuestionCardProps["question"]>) => void;
  onDelete: (id: string) => void;
  onToggleSelect?: (id: string) => void;
  isSelectable?: boolean;
  isEditable?: boolean;
  optionCount: number;
}

const QuestionCard = ({
  question,
  index,
  onUpdate,
  onDelete,
  onToggleSelect,
  isSelectable = false,
  isEditable = true,
  optionCount,
}: QuestionCardProps) => {
  const handleOptionChange = (optionIndex: number, value: string) => {
    const newOptions = [...question.options];
    newOptions[optionIndex] = value;
    onUpdate(question.id, { options: newOptions });
    
    // Update correct answer if it was the selected option
    if (question.correct_answer === question.options[optionIndex]) {
      onUpdate(question.id, { correct_answer: value, options: newOptions });
    }
  };

  const handleCorrectAnswerSelect = (option: string) => {
    onUpdate(question.id, { correct_answer: option });
  };

  return (
    <Card
      className={`p-4 relative transition-all ${
        question.selected
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/20"
          : "border-border/50 hover:border-primary/30"
      }`}
    >
      <div className="flex items-start gap-3">
        {isSelectable && (
          <div className="pt-1">
            <Checkbox
              checked={question.selected}
              onCheckedChange={() => onToggleSelect?.(question.id)}
              className="border-primary data-[state=checked]:bg-primary"
            />
          </div>
        )}
        
        <div className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">Q{index + 1}</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  question.difficulty === "easy"
                    ? "bg-green-500/20 text-green-400"
                    : question.difficulty === "medium"
                    ? "bg-yellow-500/20 text-yellow-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {question.difficulty}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                {question.type === "multiple_choice" ? "MCQ" : "Open"}
              </span>
            </div>
            
            {isEditable && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(question.id)}
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-foreground text-sm">Question</Label>
            {isEditable ? (
              <Input
                value={question.question}
                onChange={(e) => onUpdate(question.id, { question: e.target.value })}
                placeholder="Enter your question"
                className="bg-card/50 border-primary/30"
              />
            ) : (
              <p className="text-foreground">{question.question}</p>
            )}
          </div>

          {question.type === "multiple_choice" && (
            <div className="space-y-2">
              <Label className="text-foreground text-sm">Options (click to mark correct)</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {question.options.slice(0, optionCount).map((option, optIndex) => (
                  <div
                    key={optIndex}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                      question.correct_answer === option
                        ? "border-green-500 bg-green-500/10"
                        : "border-border/50 hover:border-primary/30"
                    }`}
                    onClick={() => !isEditable && handleCorrectAnswerSelect(option)}
                  >
                    {isEditable ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCorrectAnswerSelect(option);
                          }}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                            question.correct_answer === option
                              ? "border-green-500 bg-green-500"
                              : "border-muted-foreground"
                          }`}
                        >
                          {question.correct_answer === option && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </button>
                        <Input
                          value={option}
                          onChange={(e) => handleOptionChange(optIndex, e.target.value)}
                          placeholder={`Option ${optIndex + 1}`}
                          className="flex-1 h-8 bg-transparent border-none focus-visible:ring-0"
                          onClick={(e) => e.stopPropagation()}
                        />
                      </>
                    ) : (
                      <>
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            question.correct_answer === option
                              ? "border-green-500 bg-green-500"
                              : "border-muted-foreground"
                          }`}
                        >
                          {question.correct_answer === option && (
                            <Check className="w-3 h-3 text-white" />
                          )}
                        </div>
                        <span className="flex-1 text-sm">{option}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {question.type === "open_ended" && (
            <div className="space-y-2">
              <Label className="text-foreground text-sm">Expected Answer</Label>
              {isEditable ? (
                <Input
                  value={question.correct_answer}
                  onChange={(e) => onUpdate(question.id, { correct_answer: e.target.value })}
                  placeholder="Enter the expected answer"
                  className="bg-card/50 border-primary/30"
                />
              ) : (
                <p className="text-muted-foreground text-sm">{question.correct_answer}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default QuestionCard;

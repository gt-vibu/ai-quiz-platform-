import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus, BookOpen, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Question {
  id: string;
  topic?: string;
  subtopic?: string;
  difficulty: string;
  points: number;
}

interface AnswerDetail {
  question_id: string;
  is_correct: boolean;
  time_spent: number;
}

interface TopicAnalysisProps {
  questions: Question[];
  answerDetails: AnswerDetail[];
}

interface TopicPerformance {
  topic: string;
  subtopics: {
    [key: string]: {
      correct: number;
      total: number;
      timeSpent: number;
    };
  };
  correct: number;
  total: number;
  timeSpent: number;
}

export const TopicAnalysis = ({ questions, answerDetails }: TopicAnalysisProps) => {
  // Build topic/subtopic performance map
  const topicPerformance: { [key: string]: TopicPerformance } = {};

  answerDetails.forEach((detail) => {
    const question = questions.find((q) => q.id === detail.question_id);
    const topic = question?.topic || "General";
    const subtopic = question?.subtopic || "General";

    if (!topicPerformance[topic]) {
      topicPerformance[topic] = {
        topic,
        subtopics: {},
        correct: 0,
        total: 0,
        timeSpent: 0,
      };
    }

    topicPerformance[topic].total++;
    topicPerformance[topic].timeSpent += detail.time_spent;
    if (detail.is_correct) topicPerformance[topic].correct++;

    if (!topicPerformance[topic].subtopics[subtopic]) {
      topicPerformance[topic].subtopics[subtopic] = {
        correct: 0,
        total: 0,
        timeSpent: 0,
      };
    }

    topicPerformance[topic].subtopics[subtopic].total++;
    topicPerformance[topic].subtopics[subtopic].timeSpent += detail.time_spent;
    if (detail.is_correct) {
      topicPerformance[topic].subtopics[subtopic].correct++;
    }
  });

  const getPerformanceLevel = (percentage: number) => {
    if (percentage >= 80) return { label: "Excellent", color: "text-green-500", bg: "bg-green-500" };
    if (percentage >= 60) return { label: "Good", color: "text-blue-500", bg: "bg-blue-500" };
    if (percentage >= 40) return { label: "Average", color: "text-yellow-500", bg: "bg-yellow-500" };
    return { label: "Needs Improvement", color: "text-red-500", bg: "bg-red-500" };
  };

  const getIcon = (percentage: number) => {
    if (percentage >= 70) return <TrendingUp className="w-5 h-5 text-green-500" />;
    if (percentage >= 40) return <Minus className="w-5 h-5 text-yellow-500" />;
    return <TrendingDown className="w-5 h-5 text-red-500" />;
  };

  // Generate insights
  const insights: string[] = [];
  const strengths: { topic: string; subtopic?: string; percentage: number }[] = [];
  const weaknesses: { topic: string; subtopic?: string; percentage: number }[] = [];

  Object.values(topicPerformance).forEach((perf) => {
    const topicPercent = (perf.correct / perf.total) * 100;
    
    if (topicPercent >= 70) {
      strengths.push({ topic: perf.topic, percentage: topicPercent });
    } else if (topicPercent < 50) {
      weaknesses.push({ topic: perf.topic, percentage: topicPercent });
    }

    Object.entries(perf.subtopics).forEach(([subtopic, stats]) => {
      const subtopicPercent = (stats.correct / stats.total) * 100;
      if (subtopicPercent >= 70 && stats.total >= 1) {
        strengths.push({ topic: perf.topic, subtopic, percentage: subtopicPercent });
      } else if (subtopicPercent < 50 && stats.total >= 1) {
        weaknesses.push({ topic: perf.topic, subtopic, percentage: subtopicPercent });
      }
    });
  });

  // Generate personalized insights
  if (weaknesses.length > 0) {
    const topWeakness = weaknesses.sort((a, b) => a.percentage - b.percentage)[0];
    insights.push(
      `Focus on improving in ${topWeakness.subtopic ? `${topWeakness.subtopic} (${topWeakness.topic})` : topWeakness.topic} - only ${topWeakness.percentage.toFixed(0)}% correct`
    );
  }

  if (strengths.length > 0) {
    const topStrength = strengths.sort((a, b) => b.percentage - a.percentage)[0];
    insights.push(
      `Strong in ${topStrength.subtopic ? `${topStrength.subtopic} (${topStrength.topic})` : topStrength.topic} - ${topStrength.percentage.toFixed(0)}% correct`
    );
  }

  return (
    <Card className="p-6 bg-card/50 border-primary/20">
      <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-2">
        <BookOpen className="w-6 h-6 text-primary" />
        Topic & Subtopic Analysis
      </h2>

      {/* Topic Performance Grid */}
      <div className="space-y-6">
        {Object.values(topicPerformance).map((perf) => {
          const percentage = (perf.correct / perf.total) * 100;
          const level = getPerformanceLevel(percentage);

          return (
            <div key={perf.topic} className="border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getIcon(percentage)}
                  <h3 className="text-lg font-semibold text-foreground">{perf.topic}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${level.color}`}>{level.label}</span>
                  <span className="text-sm font-bold text-foreground">{percentage.toFixed(0)}%</span>
                </div>
              </div>

              <Progress value={percentage} className="h-2 mb-4" />

              <div className="flex justify-between text-sm text-muted-foreground mb-4">
                <span>{perf.correct}/{perf.total} correct</span>
                <span>Avg time: {Math.round(perf.timeSpent / perf.total)}s per question</span>
              </div>

              {/* Subtopics */}
              {Object.keys(perf.subtopics).length > 0 && (
                <div className="pl-4 border-l-2 border-primary/30 space-y-3">
                  {Object.entries(perf.subtopics).map(([subtopic, stats]) => {
                    const subPercent = (stats.correct / stats.total) * 100;
                    const subLevel = getPerformanceLevel(subPercent);

                    return (
                      <div key={subtopic} className="bg-muted/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">{subtopic}</span>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs ${subLevel.color}`}>{subPercent.toFixed(0)}%</span>
                            <span className="text-xs text-muted-foreground">
                              ({stats.correct}/{stats.total})
                            </span>
                          </div>
                        </div>
                        <Progress value={subPercent} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Personalized Insights */}
      {insights.length > 0 && (
        <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
          <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Personalized Recommendations
          </h3>
          <ul className="space-y-2">
            {insights.map((insight, idx) => (
              <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                <span className="text-primary">•</span>
                {insight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Strengths & Weaknesses Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {strengths.length > 0 && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Strong Areas
            </h4>
            <ul className="space-y-1">
              {strengths.slice(0, 5).map((s, idx) => (
                <li key={idx} className="text-sm text-green-600 dark:text-green-400">
                  ✓ {s.subtopic ? `${s.subtopic} (${s.topic})` : s.topic} - {s.percentage.toFixed(0)}%
                </li>
              ))}
            </ul>
          </div>
        )}

        {weaknesses.length > 0 && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-500" />
              Areas to Improve
            </h4>
            <ul className="space-y-1">
              {weaknesses.slice(0, 5).map((w, idx) => (
                <li key={idx} className="text-sm text-red-600 dark:text-red-400">
                  • {w.subtopic ? `${w.subtopic} (${w.topic})` : w.topic} - {w.percentage.toFixed(0)}%
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
};

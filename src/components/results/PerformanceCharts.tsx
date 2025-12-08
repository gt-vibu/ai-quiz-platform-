import { Card } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { BarChart3 } from "lucide-react";

interface AnswerDetail {
  question_id: string;
  is_correct: boolean;
  time_spent: number;
  difficulty: string;
}

interface Question {
  id: string;
  topic?: string;
  subtopic?: string;
  difficulty: string;
  points: number;
}

interface PerformanceChartsProps {
  answerDetails: AnswerDetail[];
  questions: Question[];
  correctAnswers: number;
  wrongAnswers: number;
  skippedQuestions: number;
}

export const PerformanceCharts = ({
  answerDetails,
  questions,
  correctAnswers,
  wrongAnswers,
  skippedQuestions,
}: PerformanceChartsProps) => {
  // Answer distribution pie chart data
  const answerDistribution = [
    { name: "Correct", value: correctAnswers, color: "#22c55e" },
    { name: "Incorrect", value: wrongAnswers, color: "#ef4444" },
    { name: "Skipped", value: skippedQuestions, color: "#eab308" },
  ].filter((d) => d.value > 0);

  // Difficulty performance bar chart
  const difficultyPerformance = ["easy", "medium", "hard"].map((diff) => {
    const diffQuestions = questions.filter((q) => q.difficulty === diff);
    const diffAnswers = answerDetails.filter((a) => {
      const q = questions.find((q) => q.id === a.question_id);
      return q?.difficulty === diff;
    });
    const correct = diffAnswers.filter((a) => a.is_correct).length;
    const total = diffQuestions.length;
    
    return {
      difficulty: diff.charAt(0).toUpperCase() + diff.slice(1),
      correct,
      incorrect: total - correct,
      total,
      accuracy: total > 0 ? Math.round((correct / total) * 100) : 0,
    };
  }).filter((d) => d.total > 0);

  // Topic radar chart
  const topicPerformance = questions.reduce((acc, q) => {
    const topic = q.topic || "General";
    if (!acc[topic]) acc[topic] = { correct: 0, total: 0 };
    acc[topic].total++;
    const answer = answerDetails.find((a) => a.question_id === q.id);
    if (answer?.is_correct) acc[topic].correct++;
    return acc;
  }, {} as Record<string, { correct: number; total: number }>);

  const radarData = Object.entries(topicPerformance).map(([topic, stats]) => ({
    topic: topic.length > 15 ? topic.substring(0, 12) + "..." : topic,
    fullTopic: topic,
    score: Math.round((stats.correct / stats.total) * 100),
  }));

  // Time by difficulty
  const timeByDifficulty = ["easy", "medium", "hard"].map((diff) => {
    const diffAnswers = answerDetails.filter((a) => {
      const q = questions.find((q) => q.id === a.question_id);
      return q?.difficulty === diff;
    });
    const totalTime = diffAnswers.reduce((sum, a) => sum + a.time_spent, 0);
    const avgTime = diffAnswers.length > 0 ? Math.round(totalTime / diffAnswers.length) : 0;

    return {
      difficulty: diff.charAt(0).toUpperCase() + diff.slice(1),
      avgTime,
      totalTime,
    };
  }).filter((d) => d.totalTime > 0);

  return (
    <Card className="p-6 bg-card/50 border-primary/20">
      <h2 className="text-2xl font-bold mb-6 text-foreground flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-primary" />
        Performance Analytics
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Answer Distribution Pie */}
        <div className="bg-muted/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4 text-center">Answer Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={answerDistribution}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {answerDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Difficulty Performance */}
        <div className="bg-muted/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4 text-center">Performance by Difficulty</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={difficultyPerformance}>
              <XAxis dataKey="difficulty" tick={{ fill: "hsl(var(--foreground))" }} />
              <YAxis tick={{ fill: "hsl(var(--foreground))" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="correct" stackId="a" fill="#22c55e" name="Correct" />
              <Bar dataKey="incorrect" stackId="a" fill="#ef4444" name="Incorrect" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Topic Radar */}
        {radarData.length > 2 && (
          <div className="bg-muted/30 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-foreground mb-4 text-center">Topic Mastery</h3>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="topic" tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                <Radar
                  name="Score %"
                  dataKey="score"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary))"
                  fillOpacity={0.4}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Time Analysis */}
        <div className="bg-muted/30 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-foreground mb-4 text-center">Avg Time by Difficulty</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={timeByDifficulty} layout="vertical">
              <XAxis type="number" tick={{ fill: "hsl(var(--foreground))" }} />
              <YAxis dataKey="difficulty" type="category" tick={{ fill: "hsl(var(--foreground))" }} width={80} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                formatter={(value: number) => [`${value}s`, "Avg Time"]}
              />
              <Bar dataKey="avgTime" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-500">{correctAnswers}</p>
          <p className="text-sm text-muted-foreground">Correct</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-red-500">{wrongAnswers}</p>
          <p className="text-sm text-muted-foreground">Incorrect</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-yellow-500">{skippedQuestions}</p>
          <p className="text-sm text-muted-foreground">Skipped</p>
        </div>
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-primary">
            {questions.length > 0 ? Math.round((correctAnswers / questions.length) * 100) : 0}%
          </p>
          <p className="text-sm text-muted-foreground">Overall Score</p>
        </div>
      </div>
    </Card>
  );
};

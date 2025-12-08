import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Zap,
  Timer,
  Eraser,
  Syringe,
  Shield,
  Flame,
} from "lucide-react";

export interface Booster {
  id: string;
  type: BoosterType;
  used: boolean;
}

export type BoosterType =
  | "double_points"
  | "double_jeopardy"
  | "time_freeze"
  | "streak_freeze"
  | "eraser"
  | "vaccine";

export const BOOSTER_INFO: Record<
  BoosterType,
  { name: string; description: string; icon: typeof Zap; color: string }
> = {
  double_points: {
    name: "2x Points",
    description: "Double your points for this question",
    icon: Zap,
    color: "text-yellow-500 bg-yellow-500/20 border-yellow-500/50",
  },
  double_jeopardy: {
    name: "Double Jeopardy",
    description: "Double points if correct, lose points if wrong",
    icon: Flame,
    color: "text-red-500 bg-red-500/20 border-red-500/50",
  },
  time_freeze: {
    name: "Time Freeze",
    description: "Stop the timer for this question",
    icon: Timer,
    color: "text-cyan-500 bg-cyan-500/20 border-cyan-500/50",
  },
  streak_freeze: {
    name: "Streak Freeze",
    description: "Protect your streak from breaking on wrong answer",
    icon: Shield,
    color: "text-blue-500 bg-blue-500/20 border-blue-500/50",
  },
  eraser: {
    name: "Eraser",
    description: "Remove 1 random wrong option",
    icon: Eraser,
    color: "text-purple-500 bg-purple-500/20 border-purple-500/50",
  },
  vaccine: {
    name: "Vaccine",
    description: "Remove 2 wrong options (50/50)",
    icon: Syringe,
    color: "text-green-500 bg-green-500/20 border-green-500/50",
  },
};

// Generate 3 random boosters for a player
export const generateRandomBoosters = (): Booster[] => {
  const allTypes: BoosterType[] = [
    "double_points",
    "double_jeopardy",
    "time_freeze",
    "streak_freeze",
    "eraser",
    "vaccine",
  ];

  const shuffled = [...allTypes].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 3).map((type) => ({
    id: crypto.randomUUID(),
    type,
    used: false,
  }));
};

interface PowerBoostersProps {
  boosters: Booster[];
  onUseBooster: (boosterId: string, type: BoosterType) => void;
  disabled?: boolean;
  activeBooster?: BoosterType | null;
  isMultipleChoice?: boolean;
}

const PowerBoosters = ({
  boosters,
  onUseBooster,
  disabled = false,
  activeBooster = null,
  isMultipleChoice = true,
}: PowerBoostersProps) => {
  const availableBoosters = boosters.filter((b) => !b.used);

  if (availableBoosters.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-card/50 border border-accent/30">
      <span className="text-xs text-muted-foreground w-full mb-1">Power Boosters</span>
      <TooltipProvider>
        {boosters.map((booster) => {
          const info = BOOSTER_INFO[booster.type];
          const Icon = info.icon;
          const isActive = activeBooster === booster.type;
          const isEraserOrVaccine = booster.type === "eraser" || booster.type === "vaccine";
          const isDisabled = booster.used || disabled || (isEraserOrVaccine && !isMultipleChoice);

          return (
            <Tooltip key={booster.id}>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => !isDisabled && onUseBooster(booster.id, booster.type)}
                  disabled={isDisabled}
                  className={`relative transition-all ${
                    booster.used
                      ? "opacity-30 cursor-not-allowed"
                      : isActive
                      ? `${info.color} ring-2 ring-offset-2 ring-offset-background`
                      : `${info.color} hover:scale-105`
                  } ${isDisabled && !booster.used ? "opacity-50" : ""}`}
                >
                  <Icon className="w-4 h-4 mr-1" />
                  <span className="text-xs">{info.name}</span>
                  {booster.used && (
                    <span className="absolute -top-1 -right-1 text-xs bg-destructive text-destructive-foreground rounded-full w-4 h-4 flex items-center justify-center">
                      ✓
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">{info.name}</p>
                <p className="text-xs text-muted-foreground">{info.description}</p>
                {booster.used && (
                  <p className="text-xs text-destructive mt-1">Already used</p>
                )}
                {isEraserOrVaccine && !isMultipleChoice && (
                  <p className="text-xs text-destructive mt-1">Only for multiple choice</p>
                )}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
};

export default PowerBoosters;

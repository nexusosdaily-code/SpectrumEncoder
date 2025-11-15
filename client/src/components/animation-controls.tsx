import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AnimationControlsProps {
  isPlaying: boolean;
  onPlayPause: () => void;
  onReset: () => void;
  progress: number;
  speed: number;
  onSpeedChange: (speed: number) => void;
  currentTime: number;
  totalDuration: number;
}

const SPEED_OPTIONS = [0.5, 1, 2, 4];

export function AnimationControls({
  isPlaying,
  onPlayPause,
  onReset,
  progress,
  speed,
  onSpeedChange,
  currentTime,
  totalDuration,
}: AnimationControlsProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onPlayPause}
          data-testid="button-play-pause"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={onReset}
          data-testid="button-reset-animation"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        <div className="flex gap-1 ml-4">
          {SPEED_OPTIONS.map((s) => (
            <Badge
              key={s}
              variant={speed === s ? "default" : "outline"}
              className="cursor-pointer hover-elevate px-3"
              onClick={() => onSpeedChange(s)}
              data-testid={`badge-speed-${s}`}
            >
              {s}x
            </Badge>
          ))}
        </div>

        <div className="ml-auto text-sm font-mono text-muted-foreground" data-testid="text-time">
          {Math.floor(currentTime)}ms / {totalDuration}ms
        </div>
      </div>

      <Progress value={progress} className="h-2" data-testid="progress-animation" />
    </div>
  );
}

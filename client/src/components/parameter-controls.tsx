import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { DEFAULT_TS_MS, DEFAULT_TG_MS } from "@shared/constants";

interface ParameterControlsProps {
  tsMs: number;
  tgMs: number;
  onTsMsChange: (value: number) => void;
  onTgMsChange: (value: number) => void;
  onReset: () => void;
}

export function ParameterControls({
  tsMs,
  tgMs,
  onTsMsChange,
  onTgMsChange,
  onReset,
}: ParameterControlsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Timing Parameters
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          data-testid="button-reset-parameters"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="ts-slider" className="text-sm font-medium">
              Symbol Duration (TS)
            </Label>
            <span className="text-sm font-mono text-muted-foreground" data-testid="text-ts-value">
              {tsMs}ms
            </span>
          </div>
          <Slider
            id="ts-slider"
            min={50}
            max={500}
            step={10}
            value={[tsMs]}
            onValueChange={(values) => onTsMsChange(values[0])}
            data-testid="slider-ts"
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="tg-slider" className="text-sm font-medium">
              Guard Interval (TG)
            </Label>
            <span className="text-sm font-mono text-muted-foreground" data-testid="text-tg-value">
              {tgMs}ms
            </span>
          </div>
          <Slider
            id="tg-slider"
            min={10}
            max={200}
            step={10}
            value={[tgMs]}
            onValueChange={(values) => onTgMsChange(values[0])}
            data-testid="slider-tg"
          />
        </div>
      </div>
    </div>
  );
}

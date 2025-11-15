import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Trash2, Scan } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EncoderSectionProps {
  message: string;
  onMessageChange: (message: string) => void;
  onEncode: () => void;
  onClear?: () => void;
  includeCalibration?: boolean;
  setIncludeCalibration?: (value: boolean) => void;
}

export function EncoderSection({
  message,
  onMessageChange,
  onEncode,
  onClear,
  includeCalibration = true,
  setIncludeCalibration,
}: EncoderSectionProps) {
  const letterCount = message.replace(/[^A-Za-z]/g, "").length;

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="encoder-input" className="text-lg font-semibold">
            Encode Message
          </Label>
          <span className="text-xs text-muted-foreground font-mono" data-testid="text-letter-count">
            {letterCount} {letterCount === 1 ? "letter" : "letters"}
          </span>
        </div>

        <Textarea
          id="encoder-input"
          placeholder="Enter your message here... (A-Z only)"
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          className="h-40 resize-none font-mono text-base"
          data-testid="textarea-encoder"
        />

        {/* Calibration option */}
        <div className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
          <Checkbox
            id="include-calibration"
            checked={includeCalibration}
            onCheckedChange={(checked) => setIncludeCalibration?.(checked as boolean)}
            data-testid="checkbox-calibration"
          />
          <div className="space-y-1">
            <Label
              htmlFor="include-calibration"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
            >
              <Scan className="h-3.5 w-3.5" />
              Include Calibration Sequence
            </Label>
            <p className="text-xs text-muted-foreground">
              Adds calibration frames for reliable detection across different cameras and lighting.
              Increases signal length but significantly improves accuracy.
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onEncode}
            disabled={letterCount === 0}
            className="flex-1"
            data-testid="button-encode"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Encode to Color Signal
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  onMessageChange("");
                  onClear?.();
                }}
                disabled={message.length === 0}
                data-testid="button-clear-encoder"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Clear & start new message</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </Card>
  );
}

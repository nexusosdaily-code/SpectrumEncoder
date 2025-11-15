import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface EncoderSectionProps {
  message: string;
  onMessageChange: (message: string) => void;
  onEncode: () => void;
  onClear?: () => void;
}

export function EncoderSection({
  message,
  onMessageChange,
  onEncode,
  onClear,
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
        </div>
      </div>
    </Card>
  );
}

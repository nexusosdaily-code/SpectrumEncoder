import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SPECTRUM_MAP, SOF, EOF } from "@shared/constants";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function ColorSpectrumReference() {
  const [isExpanded, setIsExpanded] = useState(false);

  const letters = Object.keys(SPECTRUM_MAP).sort();

  return (
    <div className="border-t border-border">
      <Button
        variant="ghost"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-6 py-4 hover-elevate"
        data-testid="button-toggle-spectrum"
      >
        <span className="text-sm font-medium">Color Spectrum Reference</span>
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronUp className="h-4 w-4" />
        )}
      </Button>

      {isExpanded && (
        <div className="px-6 pb-6 space-y-4">
          <div className="grid grid-cols-13 gap-1">
            {letters.slice(0, 13).map((letter) => (
              <Tooltip key={letter}>
                <TooltipTrigger asChild>
                  <div
                    className="h-12 rounded-md flex items-center justify-center cursor-pointer hover-elevate border border-border"
                    style={{ backgroundColor: SPECTRUM_MAP[letter] }}
                    data-testid={`color-${letter}`}
                  >
                    <span className="text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {letter}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-mono text-xs">{SPECTRUM_MAP[letter]}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          <div className="grid grid-cols-13 gap-1">
            {letters.slice(13, 26).map((letter) => (
              <Tooltip key={letter} >
                <TooltipTrigger asChild>
                  <div
                    className="h-12 rounded-md flex items-center justify-center cursor-pointer hover-elevate border border-border"
                    style={{ backgroundColor: SPECTRUM_MAP[letter] }}
                    data-testid={`color-${letter}`}
                  >
                    <span className="text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {letter}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-mono text-xs">{SPECTRUM_MAP[letter]}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          <div className="flex gap-4 mt-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <div
                    className="h-12 w-16 rounded-md border border-border hover-elevate cursor-pointer"
                    style={{ backgroundColor: SOF }}
                    data-testid="color-sof"
                  />
                  <span className="text-sm font-medium">SOF</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-mono text-xs">{SOF} (Start of Frame)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2">
                  <div
                    className="h-12 w-16 rounded-md border border-border hover-elevate cursor-pointer"
                    style={{ backgroundColor: EOF }}
                    data-testid="color-eof"
                  />
                  <span className="text-sm font-medium">EOF</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-mono text-xs">{EOF} (End of Frame)</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}
    </div>
  );
}

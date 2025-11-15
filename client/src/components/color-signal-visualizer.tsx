import { ColorSignalElement } from "@shared/schema";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";

interface ColorSignalVisualizerProps {
  elements: ColorSignalElement[];
  currentIndex: number;
}

export function ColorSignalVisualizer({
  elements,
  currentIndex,
}: ColorSignalVisualizerProps) {
  if (elements.length === 0) {
    return (
      <Card className="p-8 flex items-center justify-center min-h-64">
        <div className="text-center space-y-2">
          <div className="text-muted-foreground text-sm">
            No signal to display
          </div>
          <p className="text-xs text-muted-foreground">
            Encode a message to see the color signal visualization
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Color Signal Timeline</h2>
        
        <div className="overflow-x-auto">
          <div className="flex gap-1 min-w-min pb-2">
            {elements.map((element, index) => {
              const isActive = index === currentIndex;
              const widthClass = element.type.includes("preamble")
                ? "w-20"
                : element.type === "guard"
                ? "w-4"
                : "w-12";

              return (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <div
                      className={`${widthClass} h-16 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${
                        isActive
                          ? "border-primary scale-110"
                          : "border-border"
                      }`}
                      style={{ backgroundColor: element.color }}
                      data-testid={`signal-element-${index}`}
                    >
                      {element.letter && (
                        <span className="text-xs font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                          {element.letter}
                        </span>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-1">
                      <p className="font-mono text-xs">{element.color}</p>
                      <p className="text-xs">
                        {element.letter || element.type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {element.duration}ms
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

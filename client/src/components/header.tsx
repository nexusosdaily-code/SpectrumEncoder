import { Waveform } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";

export function Header() {
  return (
    <header className="h-16 border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-9 w-9 rounded-md bg-primary">
          <Waveform className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visual Signal</h1>
          <p className="text-xs text-muted-foreground -mt-1">Encoder/Decoder</p>
        </div>
      </div>
      <ThemeToggle />
    </header>
  );
}

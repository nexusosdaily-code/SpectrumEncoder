import { useLocation, Link } from "wouter";
import { Radio, Camera, Sparkles } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function Header() {
  const [location] = useLocation();

  return (
    <div className="flex items-center justify-between flex-1">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center h-9 w-9 rounded-md bg-primary">
          <Radio className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Visual Signal</h1>
          <p className="text-xs text-muted-foreground -mt-1">Encoder/Decoder</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <nav className="flex items-center gap-1">
          <Link href="/">
            <Button
              variant={location === "/" ? "default" : "ghost"}
              size="sm"
              className="gap-2"
              data-testid="nav-encoder"
            >
              <Sparkles className="h-4 w-4" />
              Encoder
            </Button>
          </Link>
          <Link href="/scanner">
            <Button
              variant={location === "/scanner" ? "default" : "ghost"}
              size="sm"
              className="gap-2"
              data-testid="nav-scanner"
            >
              <Camera className="h-4 w-4" />
              Scanner
            </Button>
          </Link>
        </nav>
        <Separator orientation="vertical" className="h-6" />
        <ThemeToggle />
      </div>
    </div>
  );
}

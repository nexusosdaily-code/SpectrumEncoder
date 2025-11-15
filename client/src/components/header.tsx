import { useLocation, Link } from "wouter";
import { Radio, Camera, Sparkles, LogOut, User } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function Header() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: authData } = useQuery({
    queryKey: ["/api/auth/me"],
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/logout", undefined);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      toast({
        title: "Logged Out",
        description: "You have been logged out successfully.",
      });
      setLocation("/");
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

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
        {authData?.user ? (
          <>
            <Badge variant="outline" className="gap-1" data-testid="badge-user">
              <User className="h-3 w-3" />
              {authData.user.mobileNumber}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              {logoutMutation.isPending ? "Logging out..." : "Logout"}
            </Button>
            <Separator orientation="vertical" className="h-6" />
          </>
        ) : (
          <>
            <Link href="/login">
              <Button variant="outline" size="sm" data-testid="button-login-nav">
                Login
              </Button>
            </Link>
            <Separator orientation="vertical" className="h-6" />
          </>
        )}
        <ThemeToggle />
      </div>
    </div>
  );
}

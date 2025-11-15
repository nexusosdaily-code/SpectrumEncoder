import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smartphone } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [, setLocation] = useLocation();
  const [mobileNumber, setMobileNumber] = useState("");
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (mobile: string) => {
      const res = await apiRequest("POST", "/api/auth/login", { mobileNumber: mobile });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Login Successful",
        description: "Welcome! You can now access the scanner.",
      });
      setLocation("/scanner");
    },
    onError: () => {
      toast({
        title: "Login Failed",
        description: "Please check your mobile number and try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileNumber.trim()) {
      loginMutation.mutate(mobileNumber.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Smartphone className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Welcome</CardTitle>
          <CardDescription className="text-center">
            Enter your mobile number to access the camera scanner
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mobile-number">Mobile Number</Label>
              <Input
                id="mobile-number"
                type="tel"
                placeholder="+1234567890"
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                required
                data-testid="input-mobile-number"
                className="text-base"
              />
              <p className="text-xs text-muted-foreground">
                Include country code (e.g., +1 for US, +91 for India)
              </p>
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending || !mobileNumber.trim()}
              data-testid="button-login"
            >
              {loginMutation.isPending ? "Logging in..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

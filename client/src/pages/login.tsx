import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Smartphone, MapPin } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { countryCodes } from "@shared/countryCodes";

type SignupStep = "country" | "verification" | "location";

export default function Login() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<SignupStep>("country");
  const [countryCode, setCountryCode] = useState("+1");
  const [mobileNumber, setMobileNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [locationGranted, setLocationGranted] = useState(false);
  const { toast } = useToast();

  // Register user
  const registerMutation = useMutation({
    mutationFn: async ({ country, mobile }: { country: string; mobile: string }) => {
      const res = await apiRequest("POST", "/api/auth/register", { 
        countryCode: country, 
        mobileNumber: mobile 
      });
      return await res.json();
    },
    onSuccess: () => {
      sendVerificationMutation.mutate();
    },
    onError: (error: any) => {
      const message = error.message || "Registration failed";
      toast({
        title: "Registration Failed",
        description: message,
        variant: "destructive",
      });
    },
  });

  // Send verification code
  const sendVerificationMutation = useMutation({
    mutationFn: async () => {
      const fullNumber = `${countryCode}${mobileNumber}`;
      const res = await apiRequest("POST", "/api/auth/send-verification", { 
        mobileNumber: fullNumber 
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setStep("verification");
      toast({
        title: "Code Sent",
        description: data.code 
          ? `Verification code: ${data.code} (dev mode)` 
          : "Check your SMS for the 5-digit code.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to Send Code",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Verify code
  const verifyCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      const fullNumber = `${countryCode}${mobileNumber}`;
      const res = await apiRequest("POST", "/api/auth/verify-code", { 
        mobileNumber: fullNumber,
        code 
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setStep("location");
      toast({
        title: "Verified!",
        description: "Please grant location permission to complete signup.",
      });
    },
    onError: () => {
      toast({
        title: "Invalid Code",
        description: "Please check the code and try again.",
        variant: "destructive",
      });
    },
  });

  // Update location
  const updateLocationMutation = useMutation({
    mutationFn: async ({ lat, lng }: { lat: number; lng: number }) => {
      const res = await apiRequest("POST", "/api/auth/update-location", { 
        latitude: lat,
        longitude: lng 
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Signup Complete",
        description: "Welcome! You can now access all features.",
      });
      setLocation("/");
    },
    onError: () => {
      toast({
        title: "Location Update Failed",
        description: "Continuing without location.",
        variant: "destructive",
      });
      setLocation("/");
    },
  });

  const handleCountrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileNumber.trim()) {
      registerMutation.mutate({ 
        country: countryCode, 
        mobile: mobileNumber.trim() 
      });
    }
  };

  const handleVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verificationCode.length === 5) {
      verifyCodeMutation.mutate(verificationCode);
    }
  };

  const handleLocationPermission = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation Not Supported",
        description: "Your browser doesn't support location services.",
        variant: "destructive",
      });
      setLocation("/");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocationGranted(true);
        updateLocationMutation.mutate({ lat: latitude, lng: longitude });
      },
      (error) => {
        let message = "Location access denied";
        if (error.code === error.PERMISSION_DENIED) {
          message = "Location permission denied. You can enable it later in settings.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Location information unavailable.";
        }
        toast({
          title: "Location Error",
          description: message,
          variant: "destructive",
        });
        setLocation("/");
      }
    );
  };

  const handleSkipLocation = () => {
    toast({
      title: "Location Skipped",
      description: "You can add location later in settings.",
    });
    setLocation("/");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-full bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20">
              {step === "location" ? (
                <MapPin className="h-8 w-8 text-cyan-400" />
              ) : (
                <Smartphone className="h-8 w-8 text-cyan-400" />
              )}
            </div>
          </div>
          <CardTitle className="text-2xl text-center bg-gradient-to-r from-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
            {step === "country" && "Sign Up"}
            {step === "verification" && "Verify Mobile"}
            {step === "location" && "Location Access"}
          </CardTitle>
          <CardDescription className="text-center">
            {step === "country" && "Select your country and enter your mobile number"}
            {step === "verification" && "Enter the 5-digit code sent to your phone"}
            {step === "location" && "Grant location permission to complete signup"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "country" && (
            <form onSubmit={handleCountrySubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="country-select">Country</Label>
                <Select value={countryCode} onValueChange={setCountryCode}>
                  <SelectTrigger id="country-select" data-testid="select-country">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countryCodes.map((country) => (
                      <SelectItem 
                        key={country.code} 
                        value={country.dial_code}
                        data-testid={`country-option-${country.code}`}
                      >
                        {country.name} ({country.dial_code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="mobile-number">Mobile Number</Label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 border rounded-md bg-muted min-w-16">
                    <span className="text-sm font-medium">{countryCode}</span>
                  </div>
                  <Input
                    id="mobile-number"
                    type="tel"
                    placeholder="1234567890"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ""))}
                    required
                    data-testid="input-mobile-number"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter your number without the country code
                </p>
              </div>
              
              <Button
                type="submit"
                className="w-full"
                disabled={registerMutation.isPending || !mobileNumber.trim()}
                data-testid="button-signup"
              >
                {registerMutation.isPending ? "Registering..." : "Continue"}
              </Button>
            </form>
          )}

          {step === "verification" && (
            <form onSubmit={handleVerificationSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verification-code">Verification Code</Label>
                <Input
                  id="verification-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={5}
                  placeholder="12345"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                  required
                  data-testid="input-verification-code"
                  className="text-center text-2xl tracking-widest"
                />
                <p className="text-xs text-muted-foreground text-center">
                  Code sent to {countryCode}{mobileNumber}
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => sendVerificationMutation.mutate()}
                  disabled={sendVerificationMutation.isPending}
                  data-testid="button-resend-code"
                  className="flex-1"
                >
                  {sendVerificationMutation.isPending ? "Sending..." : "Resend Code"}
                </Button>
                <Button
                  type="submit"
                  disabled={verifyCodeMutation.isPending || verificationCode.length !== 5}
                  data-testid="button-verify"
                  className="flex-1"
                >
                  {verifyCodeMutation.isPending ? "Verifying..." : "Verify"}
                </Button>
              </div>
            </form>
          )}

          {step === "location" && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <p className="text-sm">
                  We'll use your location to verify your registration and provide location-based features.
                </p>
                <p className="text-xs text-muted-foreground">
                  Your location data is stored securely and never shared.
                </p>
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleSkipLocation}
                  data-testid="button-skip-location"
                  className="flex-1"
                >
                  Skip
                </Button>
                <Button
                  onClick={handleLocationPermission}
                  disabled={updateLocationMutation.isPending || locationGranted}
                  data-testid="button-grant-location"
                  className="flex-1"
                >
                  {updateLocationMutation.isPending ? "Updating..." : "Grant Permission"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

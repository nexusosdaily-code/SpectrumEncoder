import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, CameraOff, Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  sampleCenterColor,
  detectLetterFromRgb,
  isSofColor,
  isEofColor,
  isBlackColor,
  isWhiteColor,
  rgbToWavelength,
} from "@/lib/colorDetection";

interface CameraScannerProps {
  onMessageDetected?: (message: string) => void;
}

export function CameraScanner({ onMessageDetected }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [isScanning, setIsScanning] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentColor, setCurrentColor] = useState<{ r: number; g: number; b: number } | null>(null);
  const [detectedLetter, setDetectedLetter] = useState<string | null>(null);
  const [wavelength, setWavelength] = useState<number | null>(null);
  const [buffer, setBuffer] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<string>("Ready to scan");
  const [error, setError] = useState<string | null>(null);
  const lastDetectedLetterRef = useRef<string | null>(null);
  const letterFrameCountRef = useRef<number>(0);
  const currentLetterRef = useRef<string | null>(null);
  const inGuardIntervalRef = useRef<boolean>(false);
  const LETTER_THRESHOLD = 2; // Require 2+ consecutive same-color frames to confirm letter

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStatus("Camera active - ready to scan");
    } catch (err) {
      setError("Failed to access camera. Please grant camera permissions.");
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setIsScanning(false);
    setIsRecording(false);
    setStatus("Camera stopped");
  };

  const processFrame = () => {
    if (!videoRef.current || !canvasRef.current || !isScanning) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.readyState !== video.HAVE_ENOUGH_DATA) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }
    
    // Draw video frame to canvas
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    // Sample center color
    const color = sampleCenterColor(canvas, 30);
    if (!color) {
      animationRef.current = requestAnimationFrame(processFrame);
      return;
    }
    
    setCurrentColor(color);
    
    const { r, g, b } = color;
    
    // Detect wavelength
    const wl = rgbToWavelength(r, g, b);
    setWavelength(wl);
    
    // Check for markers and letters with guard state tracking
    if (isSofColor(r, g, b)) {
      setDetectedLetter("SOF");
      setStatus("Start of Frame detected!");
      setIsRecording(true);
      setBuffer([]);
      lastDetectedLetterRef.current = null;
      letterFrameCountRef.current = 0;
      currentLetterRef.current = null;
      inGuardIntervalRef.current = false;
    } else if (isEofColor(r, g, b)) {
      setDetectedLetter("EOF");
      if (isRecording && buffer.length > 0) {
        const message = buffer.join("");
        setStatus(`Message decoded: ${message}`);
        onMessageDetected?.(message);
      } else {
        setStatus("End of Frame detected!");
      }
      setIsRecording(false);
      lastDetectedLetterRef.current = null;
      letterFrameCountRef.current = 0;
      currentLetterRef.current = null;
      inGuardIntervalRef.current = false;
    } else if (isBlackColor(r, g, b)) {
      setDetectedLetter("GUARD");
      letterFrameCountRef.current = 0;
      currentLetterRef.current = null;
      
      // Mark that we're in a guard interval - this allows next letter to be added
      // even if it's the same as the previous one
      inGuardIntervalRef.current = true;
    } else if (isWhiteColor(r, g, b)) {
      setDetectedLetter("PREAMBLE");
      setStatus("Preamble detected - waiting for SOF");
      letterFrameCountRef.current = 0;
      currentLetterRef.current = null;
      inGuardIntervalRef.current = false;
    } else {
      // Try to detect letter using perceptual color matching
      const letter = detectLetterFromRgb(r, g, b, 30);
      setDetectedLetter(letter);
      
      if (isRecording && letter) {
        // Track consecutive frames of the same letter
        if (currentLetterRef.current === letter) {
          letterFrameCountRef.current++;
        } else {
          currentLetterRef.current = letter;
          letterFrameCountRef.current = 1;
        }
        
        // Add to buffer after confirmed letter detection (2+ consecutive frames)
        if (letterFrameCountRef.current >= LETTER_THRESHOLD) {
          // Add letter if:
          // 1. It's different from the last buffered letter, OR
          // 2. We just exited a guard interval (allows repeated letters)
          if (lastDetectedLetterRef.current !== letter || inGuardIntervalRef.current) {
            setBuffer(prev => {
              const updated = [...prev, letter];
              setStatus(`Recording: ${updated.join("")}`);
              return updated;
            });
            lastDetectedLetterRef.current = letter;
            inGuardIntervalRef.current = false; // Clear guard flag after using it
            letterFrameCountRef.current = 0; // Reset counter after adding
          }
        }
      } else {
        // Reset counters if not recording or no letter detected
        letterFrameCountRef.current = 0;
        currentLetterRef.current = null;
      }
    }
    
    animationRef.current = requestAnimationFrame(processFrame);
  };

  const toggleScanning = () => {
    if (isScanning) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      setIsScanning(false);
      setIsRecording(false);
      setStatus("Scanning paused");
    } else {
      setIsScanning(true);
      setStatus("Scanning...");
      processFrame();
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Camera Scanner</h2>
          <Badge variant={isRecording ? "default" : "outline"} className="gap-1">
            <Activity className={`h-3 w-3 ${isRecording ? "animate-pulse" : ""}`} />
            {isRecording ? "Recording" : "Idle"}
          </Badge>
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="relative aspect-video bg-muted rounded-md overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          
          {/* Center crosshair */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-32 h-32">
              <div className="absolute inset-0 border-2 border-primary rounded-lg" />
              <div className="absolute top-1/2 left-1/2 w-4 h-[2px] bg-primary -translate-x-1/2" />
              <div className="absolute top-1/2 left-1/2 h-4 w-[2px] bg-primary -translate-y-1/2" />
            </div>
          </div>
          
          {/* Color indicator */}
          {currentColor && (
            <div className="absolute top-4 right-4 flex gap-2">
              <div
                className="w-16 h-16 rounded-md border-2 border-white shadow-lg"
                style={{ backgroundColor: `rgb(${currentColor.r}, ${currentColor.g}, ${currentColor.b})` }}
              />
            </div>
          )}
          
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Detected</div>
            <div className="text-lg font-mono font-semibold" data-testid="text-detected-letter">
              {detectedLetter || "-"}
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Wavelength</div>
            <div className="text-lg font-mono" data-testid="text-wavelength">
              {wavelength ? `${Math.round(wavelength)}nm` : "-"}
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Buffered Message</div>
          <div className="p-2 bg-muted rounded-md font-mono min-h-[2.5rem]" data-testid="text-buffer">
            {buffer.join("") || "(empty)"}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">Status</div>
          <div className="text-sm" data-testid="text-status">
            {status}
          </div>
        </div>

        <div className="flex gap-2">
          {!stream ? (
            <Button onClick={startCamera} className="flex-1 gap-2" data-testid="button-start-camera">
              <Camera className="h-4 w-4" />
              Start Camera
            </Button>
          ) : (
            <>
              <Button
                onClick={toggleScanning}
                variant={isScanning ? "outline" : "default"}
                className="flex-1 gap-2"
                data-testid="button-toggle-scan"
              >
                {isScanning ? <CameraOff className="h-4 w-4" /> : <Camera className="h-4 w-4" />}
                {isScanning ? "Stop Scanning" : "Start Scanning"}
              </Button>
              <Button onClick={stopCamera} variant="destructive" data-testid="button-stop-camera">
                <CameraOff className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

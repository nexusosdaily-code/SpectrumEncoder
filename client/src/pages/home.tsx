import { useState, useEffect, useRef } from "react";
import { Header } from "@/components/header";
import { EncoderSection } from "@/components/encoder-section";
import { DecoderSection } from "@/components/decoder-section";
import { ParameterControls } from "@/components/parameter-controls";
import { ColorSignalVisualizer } from "@/components/color-signal-visualizer";
import { AnimationControls } from "@/components/animation-controls";
import { ColorSpectrumReference } from "@/components/color-spectrum-reference";
import { DEFAULT_TS_MS, DEFAULT_TG_MS } from "@shared/constants";
import { ColorSignalElement } from "@shared/schema";
import { encodeMessage, decodeSignal, calculateTotalDuration } from "@/lib/encoding";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [message, setMessage] = useState("");
  const [encodedElements, setEncodedElements] = useState<ColorSignalElement[]>([]);
  const [decodedMessage, setDecodedMessage] = useState("");
  const [tsMs, setTsMs] = useState(DEFAULT_TS_MS);
  const [tgMs, setTgMs] = useState(DEFAULT_TG_MS);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentTime, setCurrentTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const { toast } = useToast();
  
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const pausedTimeRef = useRef<number>(0);

  const totalDuration = calculateTotalDuration(encodedElements);

  const handleEncode = () => {
    const elements = encodeMessage(message, tsMs, tgMs);
    setEncodedElements(elements);
    setDecodedMessage("");
    setCurrentIndex(-1);
    setCurrentTime(0);
    setIsPlaying(false);
    pausedTimeRef.current = 0;
    
    toast({
      title: "Message Encoded",
      description: `Generated ${elements.length} signal elements`,
    });
  };

  const handlePlayPause = () => {
    if (encodedElements.length === 0) return;
    
    if (isPlaying) {
      setIsPlaying(false);
      pausedTimeRef.current = currentTime;
    } else {
      setIsPlaying(true);
      startTimeRef.current = performance.now() - pausedTimeRef.current;
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(-1);
    setCurrentTime(0);
    pausedTimeRef.current = 0;
  };

  const handleResetParameters = () => {
    setTsMs(DEFAULT_TS_MS);
    setTgMs(DEFAULT_TG_MS);
    toast({
      title: "Parameters Reset",
      description: "Timing parameters restored to defaults",
    });
  };

  useEffect(() => {
    if (!isPlaying || encodedElements.length === 0) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = (timestamp - startTimeRef.current) * speed;
      setCurrentTime(elapsed);

      let accumulatedTime = 0;
      let foundIndex = -1;

      for (let i = 0; i < encodedElements.length; i++) {
        accumulatedTime += encodedElements[i].duration;
        if (elapsed < accumulatedTime) {
          foundIndex = i;
          break;
        }
      }

      setCurrentIndex(foundIndex);

      if (elapsed >= totalDuration) {
        setIsPlaying(false);
        setCurrentIndex(encodedElements.length - 1);
        setCurrentTime(totalDuration);
        pausedTimeRef.current = totalDuration;
        
        // Decode the message when animation completes
        const decoded = decodeSignal(encodedElements);
        setDecodedMessage(decoded);
        
        toast({
          title: "Signal Complete",
          description: `Message decoded: ${decoded}`,
        });
      } else {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, encodedElements, speed, totalDuration, toast]);

  const progress = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 overflow-hidden">
        <div className="h-full grid grid-cols-1 lg:grid-cols-[minmax(400px,600px)_1fr]">
          {/* Left Panel - Controls */}
          <div className="overflow-y-auto border-r border-border">
            <div className="p-6 space-y-6 max-w-2xl">
              <EncoderSection
                message={message}
                onMessageChange={setMessage}
                onEncode={handleEncode}
              />

              <ParameterControls
                tsMs={tsMs}
                tgMs={tgMs}
                onTsMsChange={setTsMs}
                onTgMsChange={setTgMs}
                onReset={handleResetParameters}
              />

              <DecoderSection decodedMessage={decodedMessage} />
            </div>
          </div>

          {/* Right Panel - Visualization */}
          <div className="overflow-y-auto">
            <div className="p-6 space-y-6">
              <ColorSignalVisualizer
                elements={encodedElements}
                currentIndex={currentIndex}
              />

              {encodedElements.length > 0 && (
                <AnimationControls
                  isPlaying={isPlaying}
                  onPlayPause={handlePlayPause}
                  onReset={handleReset}
                  progress={progress}
                  speed={speed}
                  onSpeedChange={setSpeed}
                  currentTime={currentTime}
                  totalDuration={totalDuration}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      <ColorSpectrumReference />
    </div>
  );
}

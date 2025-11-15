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
  const lastTimestampRef = useRef<number>();

  const totalDuration = calculateTotalDuration(encodedElements);

  const handleEncode = () => {
    const elements = encodeMessage(message, tsMs, tgMs);
    setEncodedElements(elements);
    
    // Immediately decode to show the result
    const decoded = decodeSignal(elements);
    setDecodedMessage(decoded);
    
    setCurrentIndex(-1);
    setCurrentTime(0);
    setIsPlaying(false);
    lastTimestampRef.current = undefined;
    
    toast({
      title: "Message Encoded",
      description: `Generated ${elements.length} signal elements. Decoded: ${decoded}`,
    });
  };

  const handlePlayPause = () => {
    if (encodedElements.length === 0) return;
    
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      lastTimestampRef.current = undefined;
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(-1);
    setCurrentTime(0);
    lastTimestampRef.current = undefined;
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
      if (!lastTimestampRef.current) {
        lastTimestampRef.current = timestamp;
      }

      const deltaTime = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;

      // Update current time by adding scaled delta
      const newTime = Math.min(currentTime + (deltaTime * speed), totalDuration);
      setCurrentTime(newTime);

      // Find current element index based on accumulated duration
      let accumulatedTime = 0;
      let foundIndex = -1;

      for (let i = 0; i < encodedElements.length; i++) {
        accumulatedTime += encodedElements[i].duration;
        if (newTime < accumulatedTime) {
          foundIndex = i;
          break;
        }
      }

      if (foundIndex === -1 && encodedElements.length > 0) {
        foundIndex = encodedElements.length - 1;
      }

      setCurrentIndex(foundIndex);

      if (newTime >= totalDuration) {
        setIsPlaying(false);
        setCurrentIndex(encodedElements.length - 1);
        setCurrentTime(totalDuration);
        
        toast({
          title: "Animation Complete",
          description: "Visual signal playback finished",
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
  }, [isPlaying, encodedElements, speed, totalDuration, toast, currentTime]);

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

import { useState } from "react";
import { CameraScanner } from "@/components/camera-scanner";
import { Card } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";

export default function Scanner() {
  const [decodedMessages, setDecodedMessages] = useState<string[]>([]);

  const handleMessageDetected = (message: string) => {
    setDecodedMessages(prev => [message, ...prev]);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Camera Scanner</h1>
          <p className="text-muted-foreground mt-2">
            Point your camera at another device displaying a color signal to decode the message
          </p>
        </div>

        <CameraScanner onMessageDetected={handleMessageDetected} />

        {decodedMessages.length > 0 && (
          <Card className="p-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Decoded Messages
              </h3>
              <div className="space-y-2">
                {decodedMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-muted rounded-md font-mono text-lg"
                    data-testid={`decoded-message-${idx}`}
                  >
                    {msg}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        <Card className="p-6 bg-muted/30">
          <div className="space-y-3">
            <h3 className="font-semibold">How to use:</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Grant camera permissions when prompted</li>
              <li>Point your camera at another device showing the flashing color signal</li>
              <li>Center the display in the crosshair overlay</li>
              <li>Keep the camera steady until the message is fully decoded</li>
              <li>The scanner detects colors based on wavelength values (380-740nm visible spectrum)</li>
            </ol>
          </div>
        </Card>
      </div>
    </div>
  );
}

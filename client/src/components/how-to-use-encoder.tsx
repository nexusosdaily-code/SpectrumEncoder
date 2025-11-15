import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Settings, Library } from "lucide-react";

export function HowToUseEncoder() {
  return (
    <Card data-testid="card-how-to-use">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <CardTitle>How To Use</CardTitle>
        </div>
        <CardDescription>
          Learn how to encode messages into visual color signals
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="getting-started" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="getting-started" data-testid="tab-getting-started">
              Getting Started
            </TabsTrigger>
            <TabsTrigger value="timing" data-testid="tab-timing">
              <Settings className="h-3 w-3 mr-1" />
              Settings
            </TabsTrigger>
            <TabsTrigger value="library" data-testid="tab-library">
              <Library className="h-3 w-3 mr-1" />
              Library
            </TabsTrigger>
          </TabsList>

          <TabsContent value="getting-started" className="space-y-4 mt-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Encoding Your Message</h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <Badge variant="outline" className="h-5 min-w-5 flex items-center justify-center">1</Badge>
                  <span>Type your message in the text field (A-Z letters only)</span>
                </li>
                <li className="flex gap-2">
                  <Badge variant="outline" className="h-5 min-w-5 flex items-center justify-center">2</Badge>
                  <span>Enable <strong>Calibration</strong> for reliable cross-device scanning</span>
                </li>
                <li className="flex gap-2">
                  <Badge variant="outline" className="h-5 min-w-5 flex items-center justify-center">3</Badge>
                  <span>Click <strong>Encode Message</strong> to generate the visual signal</span>
                </li>
                <li className="flex gap-2">
                  <Badge variant="outline" className="h-5 min-w-5 flex items-center justify-center">4</Badge>
                  <span>Press <strong>Play</strong> to animate the color sequence</span>
                </li>
                <li className="flex gap-2">
                  <Badge variant="outline" className="h-5 min-w-5 flex items-center justify-center">5</Badge>
                  <span>Point another device's camera at the screen to decode</span>
                </li>
              </ol>
            </div>

            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-xs text-muted-foreground">
                <strong>Tip:</strong> Each letter is mapped to a specific color in the visible spectrum. 
                The color sequence includes embedded wavelength data for robust decoding.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="timing" className="space-y-4 mt-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Timing Parameters</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary">TS</Badge>
                    <strong>Symbol Duration</strong>
                  </div>
                  <p className="text-muted-foreground ml-8">
                    Controls how long each color flash displays (50-500ms). 
                    Longer durations are easier to scan but slower.
                  </p>
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary">TG</Badge>
                    <strong>Guard Time</strong>
                  </div>
                  <p className="text-muted-foreground ml-8">
                    Black interval between letters (10-200ms). 
                    Helps the scanner distinguish repeated letters.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Calibration Sequence</h3>
              <p className="text-sm text-muted-foreground">
                When enabled, adds reference wavelengths at the start of transmission. 
                This helps scanners adapt to different displays and lighting conditions.
              </p>
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-xs text-muted-foreground">
                  <strong>Recommended:</strong> Keep calibration enabled for the most reliable decoding, 
                  especially in varying lighting conditions or across different devices.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="library" className="space-y-4 mt-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Saved Messages Library</h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <Badge variant="outline" className="h-5 min-w-5 flex items-center justify-center">1</Badge>
                  <span>After encoding a message, click <strong>Save to Library</strong></span>
                </li>
                <li className="flex gap-2">
                  <Badge variant="outline" className="h-5 min-w-5 flex items-center justify-center">2</Badge>
                  <span>Access your saved messages from the sidebar (toggle button in top-left)</span>
                </li>
                <li className="flex gap-2">
                  <Badge variant="outline" className="h-5 min-w-5 flex items-center justify-center">3</Badge>
                  <span>Click any saved message to load it instantly</span>
                </li>
                <li className="flex gap-2">
                  <Badge variant="outline" className="h-5 min-w-5 flex items-center justify-center">4</Badge>
                  <span>Make changes and click <strong>Update in Library</strong> to save edits</span>
                </li>
                <li className="flex gap-2">
                  <Badge variant="outline" className="h-5 min-w-5 flex items-center justify-center">5</Badge>
                  <span>Delete messages you no longer need from the sidebar</span>
                </li>
              </ol>
            </div>

            <div className="bg-muted/50 p-3 rounded-md">
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> Your saved messages include all timing parameters, 
                so you can quickly replay frequently-used signals.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

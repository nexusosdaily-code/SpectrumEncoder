import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DecoderSectionProps {
  decodedMessage: string;
}

export function DecoderSection({ decodedMessage }: DecoderSectionProps) {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="decoder-output" className="text-lg font-semibold">
            Decoded Message
          </Label>
          {decodedMessage && (
            <Badge variant="secondary" data-testid="badge-decoded">
              Decoded
            </Badge>
          )}
        </div>

        <Textarea
          id="decoder-output"
          value={decodedMessage}
          readOnly
          className="h-40 resize-none font-mono text-base bg-muted"
          placeholder="Decoded message will appear here..."
          data-testid="textarea-decoder"
        />
      </div>
    </Card>
  );
}

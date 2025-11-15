import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Inbox, SendHorizontal, Mail, MailOpen } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import type { UserMessage } from "@shared/schema";
import { textToWavelengthFormat, wavelengthFormatToText } from "@shared/messageEncoding";

interface MessageWithSender extends UserMessage {
  senderMobileNumber?: string;
}

interface MessageListResult {
  messages: MessageWithSender[];
  hasMore: boolean;
}

export default function Messages() {
  const [recipientMobile, setRecipientMobile] = useState("");
  const [messageContent, setMessageContent] = useState("");
  const { toast } = useToast();

  // Fetch inbox messages with polling
  const { data: inboxData } = useQuery<MessageListResult>({
    queryKey: ["/api/messaging/inbox"],
    refetchInterval: 15000, // Poll every 15 seconds
    refetchOnWindowFocus: true,
  });

  // Fetch sent messages
  const { data: sentData } = useQuery<MessageListResult>({
    queryKey: ["/api/messaging/sent"],
    refetchInterval: 30000, // Poll every 30 seconds
  });

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (data: { recipientMobileNumber: string; messageContent: string }) => {
      const res = await apiRequest("POST", "/api/messaging/send", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messaging/sent"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messaging/unread-count"] });
      setRecipientMobile("");
      setMessageContent("");
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Send Failed",
        description: "Could not send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (messageId: string) => {
      const res = await apiRequest("PATCH", `/api/messaging/${messageId}/read`, undefined);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messaging/inbox"] });
      queryClient.invalidateQueries({ queryKey: ["/api/messaging/unread-count"] });
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientMobile.trim() || !messageContent.trim()) return;

    // Validate mobile number format (digits only, optionally with + prefix)
    const mobileRegex = /^\+?[0-9]+$/;
    if (!mobileRegex.test(recipientMobile)) {
      toast({
        title: "Invalid Mobile Number",
        description: "Please enter a valid mobile number (digits only, optionally starting with +)",
        variant: "destructive",
      });
      return;
    }

    // Encode the message text to wavelength format before sending
    const encodedMessage = textToWavelengthFormat(messageContent);

    sendMutation.mutate({
      recipientMobileNumber: recipientMobile,
      messageContent: encodedMessage,
    });
  };

  const handleMarkAsRead = (messageId: string) => {
    markReadMutation.mutate(messageId);
  };

  return (
    <div className="flex flex-col flex-1 h-screen">
      <header className="flex items-center justify-between p-2 border-b">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Messages</h1>
        </div>
        <Header />
      </header>

      <main className="flex-1 overflow-hidden p-6">
        <div className="h-full max-w-5xl mx-auto grid gap-6 grid-cols-1 lg:grid-cols-[1fr_400px]">
          {/* Inbox/Sent Messages */}
          <Card>
            <CardHeader>
              <CardTitle>Your Messages</CardTitle>
              <CardDescription>View your inbox and sent messages</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="inbox" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="inbox" data-testid="tab-inbox">
                    <Inbox className="h-4 w-4 mr-2" />
                    Inbox
                    {inboxData && inboxData.messages.filter(m => m.status === 'pending').length > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {inboxData.messages.filter(m => m.status === 'pending').length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="sent" data-testid="tab-sent">
                    <SendHorizontal className="h-4 w-4 mr-2" />
                    Sent
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="inbox" className="mt-4">
                  <ScrollArea className="h-[500px] pr-4">
                    {!inboxData?.messages.length ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No messages in your inbox</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {inboxData.messages.map((msg) => (
                          <Card
                            key={msg.id}
                            className={msg.status === 'pending' ? 'border-primary' : ''}
                            data-testid={`message-inbox-${msg.id}`}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    {msg.status === 'pending' ? (
                                      <Mail className="h-4 w-4 text-primary" />
                                    ) : (
                                      <MailOpen className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="font-medium text-sm">From: {msg.senderMobileNumber || 'Unknown'}</span>
                                    <Badge variant={msg.status === 'pending' ? 'default' : 'secondary'}>
                                      {msg.status}
                                    </Badge>
                                  </div>
                                  <div className="space-y-2 mb-2">
                                    <p className="text-sm font-medium text-muted-foreground">Wavelength Format:</p>
                                    <p className="text-xs font-mono bg-muted p-2 rounded overflow-x-auto">
                                      {msg.messageContent}
                                    </p>
                                    <p className="text-sm font-medium text-muted-foreground">Decoded Message:</p>
                                    <p className="text-sm">{wavelengthFormatToText(msg.messageContent)}</p>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(msg.createdAt), 'PPp')}
                                  </p>
                                </div>
                                {msg.status === 'pending' && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleMarkAsRead(msg.id)}
                                    data-testid={`button-mark-read-${msg.id}`}
                                  >
                                    Mark as Read
                                  </Button>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="sent" className="mt-4">
                  <ScrollArea className="h-[500px] pr-4">
                    {!sentData?.messages.length ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <SendHorizontal className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No sent messages yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sentData.messages.map((msg) => (
                          <Card key={msg.id} data-testid={`message-sent-${msg.id}`}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <SendHorizontal className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium text-sm">To: {msg.recipientMobileNumber}</span>
                                    <Badge variant="outline">{msg.status}</Badge>
                                  </div>
                                  <div className="space-y-2 mb-2">
                                    <p className="text-sm font-medium text-muted-foreground">Wavelength Format:</p>
                                    <p className="text-xs font-mono bg-muted p-2 rounded overflow-x-auto">
                                      {msg.messageContent}
                                    </p>
                                    <p className="text-sm font-medium text-muted-foreground">Decoded Message:</p>
                                    <p className="text-sm">{wavelengthFormatToText(msg.messageContent)}</p>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(msg.createdAt), 'PPp')}
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Compose Message */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Compose Message
              </CardTitle>
              <CardDescription>Send a message to another user</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendMessage} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="recipient" className="text-sm font-medium">
                    Recipient Mobile Number
                  </label>
                  <Input
                    id="recipient"
                    type="tel"
                    placeholder="e.g., +1234567890 or 1234567890"
                    value={recipientMobile}
                    onChange={(e) => setRecipientMobile(e.target.value)}
                    required
                    pattern="^\+?[0-9]+$"
                    data-testid="input-recipient-mobile"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="message-content" className="text-sm font-medium">
                    Message
                  </label>
                  <Textarea
                    id="message-content"
                    placeholder="Type your message..."
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    required
                    rows={8}
                    data-testid="textarea-message-content"
                  />
                </div>

                <Separator />

                <Button
                  type="submit"
                  className="w-full gap-2"
                  disabled={sendMutation.isPending || !recipientMobile.trim() || !messageContent.trim()}
                  data-testid="button-send-message"
                >
                  <Send className="h-4 w-4" />
                  {sendMutation.isPending ? "Sending..." : "Send Message"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
